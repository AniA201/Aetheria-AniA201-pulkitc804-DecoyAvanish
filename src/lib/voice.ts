// Browser speech: an automated voice and dictation, in English, Spanish, French, or Mandarin.
// Audio stays in the browser.
import { languageInfo, type Language } from "./languages";

export type VoiceLang = Language;

export const disclosure: Record<VoiceLang, string> = {
  en: "This voice is automated. A person still holds the consent conversation.",
  es: "Esta voz es automática. Una persona sigue a cargo de la conversación sobre el consentimiento.",
  fr: "Cette voix est automatique. Une personne reste responsable de la conversation sur le consentement.",
  zh: "这是自动语音。知情同意的谈话仍由真人负责。",
};

const locale = (lang: VoiceLang) => languageInfo[lang].voice;

/** The exact locale first, then any voice in the language (Mandarin voices are listed as zh-CN, zh-TW, or cmn). */
function pickVoice(lang: VoiceLang): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const prefixes = lang === "zh" ? ["zh", "cmn"] : [lang];
  return (
    voices.find((voice) => voice.lang === locale(lang)) ??
    voices.find((voice) => prefixes.some((prefix) => voice.lang.toLowerCase().startsWith(prefix))) ??
    undefined
  );
}

export const canSpeak = () => typeof window !== "undefined" && Boolean(window.speechSynthesis);

/** Speaks `text`. Resolves when the voice finishes, or right away if speech is unavailable. */
export function speak(text: string, lang: VoiceLang, rate: number, withDisclosure = true): Promise<boolean> {
  return new Promise((resolve) => {
    if (!canSpeak()) {
      resolve(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(withDisclosure ? `${disclosure[lang]} ${text}` : text);
    utterance.lang = locale(lang);
    const voice = pickVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);
    window.speechSynthesis.speak(utterance);
  });
}

export const stopSpeaking = () => window.speechSynthesis?.cancel();

type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognizer = {
  lang: string;
  interimResults?: boolean;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recognizerClass() {
  const host = window as Window & { SpeechRecognition?: new () => SpeechRecognizer; webkitSpeechRecognition?: new () => SpeechRecognizer };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition;
}

export const canListen = () => typeof window !== "undefined" && Boolean(recognizerClass());

/** Listens for one utterance. Resolves with the transcript, or null if nothing was heard or listening is unavailable. */
export function listenOnce(lang: VoiceLang): { done: Promise<string | null>; stop: () => void } {
  const Recognizer = recognizerClass();
  if (!Recognizer) return { done: Promise.resolve(null), stop: () => undefined };
  const recognition = new Recognizer();
  recognition.lang = locale(lang);
  recognition.interimResults = false;
  let heard: string | null = null;
  const done = new Promise<string | null>((resolve) => {
    recognition.onresult = (event) => {
      heard = event.results[0]?.[0]?.transcript ?? null;
    };
    recognition.onerror = () => resolve(heard);
    recognition.onend = () => resolve(heard);
  });
  recognition.start();
  return { done, stop: () => recognition.stop() };
}
