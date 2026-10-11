import { practicePrompt } from "../data/practiceLanguages";
import { consentDoc, teachPrompts, type TeachPrompt } from "../data/study";
import { stripAccents } from "../data/studyEs";
import type { Language, OtherLanguage } from "./languages";

export type Understanding =
  | "Understands the key concept"
  | "Partially understands"
  | "Needs clarification"
  | "Requires human follow-up";

export type Speaker = "participant" | "caregiver";

export type TeachResult = {
  promptId: string;
  label: Understanding;
  matched: string[];
  missing: string[];
  feedback: string;
  documentId: string;
  version: string;
  engine?: "gemini" | "ollama" | "local";
  note?: string;
  response?: string;
  speaker?: Speaker;
  misconception?: string;
  language?: Language;
  shownMatched?: string[];
  shownMissing?: string[];
  shownMisconception?: string;
};

function promptById(id: string): TeachPrompt {
  const prompt = teachPrompts.find((item) => item.id === id);
  if (!prompt) {
    throw new Error(`Unknown teach-back prompt ${id}`);
  }
  return prompt;
}

/** Empty, unsure, or a bare yes / "I consent". These never count as understanding and never go to a model. */
export function isNonAnswer(response: string): boolean {
  const clean = response.trim();
  return (
    !clean ||
    /^(i don'?t know|do not know|not sure|no idea|idk)\.?$/i.test(clean) ||
    /^(yes|ok|okay|i understand|i consent|i agree|sure)\.?$/i.test(clean)
  );
}

const spanishWords = /(?<![\p{L}])(el|la|los|las|del|que|qué|puedo|puede|estudio|médico|medico|cualquier|momento|salir|pagan|nombre|también|pero|porque|sí|está|estoy|y|de|es|mi|tengo|para|con|por|una|sé|veces|cuántas)(?![\p{L}])/giu;

const frenchWords =
  /(?<![\p{L}])(le|les|des|du|est|je|peux|peut|pas|ne|mon|ma|mes|médecin|medecin|étude|etude|quitter|partir|n'importe|payé|paye|aussi|mais|parce|oui|suis|et|vous|avec|pour|une|dans|fois|combien|ça|ce|qui|sais|rien|tout|soins|elle|il)(?![\p{L}])/giu;

/**
 * A rough guess at the language of a reply, used to pick an answer key or route the reply to a person.
 * Returns null for English or when there is too little to tell.
 */
export function detectLanguage(response: string): OtherLanguage | null {
  if ((response.match(/[\u3400-\u9fff]/g)?.length ?? 0) >= 2) return "zh";
  const es = response.match(spanishWords)?.length ?? 0;
  const fr = response.match(frenchWords)?.length ?? 0;
  const spanish = es >= 3 || /[ñ¿¡]/.test(response) || (es >= 2 && /[áéíóú]/i.test(response));
  const french = fr >= 3 || /[çèêàùûôîœ]/i.test(response) || (fr >= 2 && /é/i.test(response));
  if (spanish && french) return /[ñ¿¡]/.test(response) || es > fr ? "es" : "fr";
  return spanish ? "es" : french ? "fr" : null;
}
/** A caregiver says "she can leave". Read it as "I can leave" so the same ideas are found. */
export function asParticipant(response: string): string {
  return response
    .replace(/\b(she|he|they)\b/gi, "i")
    .replace(/\b(her|his|their)\b/gi, "my")
    .replace(/\b(him|them)\b/gi, "me")
    .replace(/\bsu (medico|doctor|atencion|nombre)\b/g, "mi $1")
    .replace(/\bpuede (salir|dejar|irse)\b/g, "puedo $1")
    .replace(/\bno sabra\b/g, "no sabre")
    .replace(/\bno paga\b/g, "no pago")
    .replace(/\b(elle|il) ne peut\b/g, "je ne peux")
    .replace(/\b(elle|il) peut\b/g, "je peux")
    .replace(/\b(elle|il) ne (paie|paye)\b/g, "je ne $2")
    .replace(/\b(elle|il) perd\b/g, "je perds")
    .replace(/\b(elle|il) doit\b/g, "je dois")
    .replace(/\b(elle|il) ne saura\b/g, "je ne saurai")
    .replace(/\bson (medecin|docteur|nom)\b/g, "mon $1")
    .replace(/\bses soins\b/g, "mes soins")
    .replace(/(?<!其)[她他]/g, "我");
}

function normalize(response: string, speaker: Speaker, language: Language): string {
  const text = stripAccents(response.trim().toLowerCase().replace(/[’‘]/g, "'"));
  const read = speaker === "caregiver" ? asParticipant(text) : text;
  return language === "zh" ? read.replace(/\s+/g, "") : read;
}

function negatedBefore(text: string, index: number, language: Language): boolean {
  if (language === "zh") {
    const clause = text.slice(Math.max(0, index - 8), index).split(/[，。！？；,.!?;]/).pop() ?? "";
    return /[不没沒未别非無无]/.test(clause);
  }
  const near = text.slice(Math.max(0, index - 20), index);
  if (/\b(not|never|isn't|aren't|won't|don't|doesn't|no one|nobody|no|nunca|nadie)\s+(\w+\s+)?$/.test(near)) return true;
  if (/\b(pas|jamais)\s+(\w+\s+)?$/.test(near)) return true;
  const wide = text.slice(Math.max(0, index - 40), index);
  // "does not promise that it will cure", "no promete que me va a curar", "ne promet pas que ça va me guérir"
  if (/\b(not|doesn't|don't|no|nunca)\s+(promise|promises|guarantee|guarantees|say|says|mean|means|promete|garantiza|dice|asegura|significa)\s+(that\s+|que\s+)?(\w+\s+){0,2}$/.test(wide)) return true;
  return /\b(ne|n')\s*(promet|garantit|dit|signifie|veut)\s+pas\s+(dire\s+)?(que\s+|qu')?(\w+\s+){0,2}$/.test(wide);
}
export function findMisconception(prompt: TeachPrompt, text: string, language: Language = "en") {
  return locateMisconception(prompt, text, language)?.item ?? null;
}

function locateMisconception(prompt: TeachPrompt, text: string, language: Language) {
  for (const item of prompt.misconceptions ?? []) {
    for (const phrase of item.phrases) {
      const index = text.indexOf(stripAccents(phrase));
      if (index >= 0 && !negatedBefore(text, index, language)) return { item, index };
    }
  }
  return null;
}

const sentenceMarks = [".", ";", "!", "?", "。", "；", "！", "？"];
/** Spoken and written Mandarin chains whole thoughts with commas, so a comma ends a clause there. */
const clauseMarksZh = [...sentenceMarks, "，", ","];

/** The text without the sentence that holds `index`, so words inside a wrong statement are not credited. */
function withoutSentenceAt(text: string, index: number, language: Language): string {
  const marks = language === "zh" ? clauseMarksZh : sentenceMarks;
  const start = Math.max(...marks.map((mark) => text.lastIndexOf(mark, index))) + 1;
  const ends = marks.map((mark) => text.indexOf(mark, index)).filter((at) => at >= 0);
  const end = ends.length ? Math.min(...ends) : text.length;
  return `${text.slice(0, start)} ${text.slice(end)}`;
}

const noKey: Record<OtherLanguage, string> = {
  es: "Esta respuesta está en español y este formulario no tiene una guía de respuestas en español. Una persona que hable español, o un intérprete calificado, debe repasar este tema con usted.",
  fr: "Cette réponse est en français et ce formulaire n'a pas de guide de réponses en français. Une personne qui parle français, ou un interprète qualifié, doit revoir ce sujet avec vous.",
  zh: "这个回答是中文的，而这份表格没有中文答案指南。应由会说中文的人或合格的口译员和您一起复习这个主题。",
};

const feedbackText: Record<
  Language,
  {
    unsure: string;
    wrong: (label: string, reexplain: string) => string;
    gesture: (reexplain: string) => string;
    none: (reexplain: string) => string;
    full: string;
    partial: (missing: string, reexplain: string) => string;
  }
> = {
  en: {
    unsure:
      "That is a good moment to talk with the research coordinator. There is no score to pass. The ideas to cover are listed here if you want to try again.",
    wrong: (label: string, reexplain: string) => `This reply suggests ${label}. The form says otherwise. ${reexplain}`,
    gesture: (reexplain: string) => `A short yes does not have to stand in for the details. ${reexplain}`,
    none: (reexplain: string) => `This reply does not yet mention the ideas this question is about. ${reexplain}`,
    full: "Your words cover the ideas this question is looking for. You can still ask the coordinator to walk through it with you.",
    partial: (missing: string, reexplain: string) => `You covered part of it. Still worth naming: ${missing}. ${reexplain}`,
  },
  es: {
    unsure:
      "Es un buen momento para hablar con el coordinador del estudio. No hay una nota que aprobar. Abajo están las ideas por si quiere intentarlo otra vez.",
    wrong: (label: string, reexplain: string) => `Esta respuesta sugiere ${label}. El formulario dice otra cosa. ${reexplain}`,
    gesture: (reexplain: string) => `Un sí corto no reemplaza los detalles. ${reexplain}`,
    none: (reexplain: string) => `Esta respuesta todavía no menciona las ideas de esta pregunta. ${reexplain}`,
    full: "Sus palabras cubren las ideas que busca esta pregunta. Igual puede pedirle al coordinador que se lo explique.",
    partial: (missing: string, reexplain: string) => `Cubrió una parte. Falta mencionar: ${missing}. ${reexplain}`,
  },
  fr: {
    unsure:
      "C'est un bon moment pour parler avec le coordinateur de l'étude. Il n'y a pas de note à obtenir. Les idées à couvrir sont listées ci-dessous si vous voulez réessayer.",
    wrong: (label: string, reexplain: string) => `Cette réponse suggère ${label}. Le formulaire dit autre chose. ${reexplain}`,
    gesture: (reexplain: string) => `Un simple oui ne remplace pas les détails. ${reexplain}`,
    none: (reexplain: string) => `Cette réponse ne mentionne pas encore les idées de cette question. ${reexplain}`,
    full: "Vos mots couvrent les idées que cette question recherche. Vous pouvez quand même demander au coordinateur de tout revoir avec vous.",
    partial: (missing: string, reexplain: string) => `Vous en avez couvert une partie. À mentionner encore : ${missing}. ${reexplain}`,
  },
  zh: {
    unsure: "这是和研究协调员谈谈的好时机。这里没有分数。如果您想再试一次，下面列出了需要说到的要点。",
    wrong: (label: string, reexplain: string) => `这个回答似乎认为：${label}。表格说的不是这样。${reexplain}`,
    gesture: (reexplain: string) => `简单说“是”不能代替具体内容。${reexplain}`,
    none: (reexplain: string) => `这个回答还没有说到这个问题的要点。${reexplain}`,
    full: "您说的内容涵盖了这个问题要找的要点。您仍然可以请协调员和您一起再过一遍。",
    partial: (missing: string, reexplain: string) => `您说到了一部分。还可以说到：${missing}。${reexplain}`,
  },
};

const unsurePattern =
  /^(i don'?t know|do not know|not sure|no idea|idk|no se|no lo se|ni idea|je ne sais pas|je sais pas|aucune idee|不知道|我不知道|不清楚|我不清楚)[.。!！]?$/i;
const gesturePattern =
  /^(yes|ok|okay|i understand|i consent|i agree|sure|si|entiendo|acepto|de acuerdo|claro|oui|d'accord|je comprends|j'accepte|是|是的|好|好的|明白|我明白|明白了|懂了|我懂了|同意|我同意|对)[.。!！]?$/i;

/**
 * Checks a reply against the answer key, in English, Spanish, French, or Mandarin.
 * A non-English key is used when the reply reads as that language, or when the screen is in that
 * language and the question is one of the five practice sections. Uploaded forms have no non-English
 * key, so a non-English reply to one goes to a person.
 * `matched` and `missing` hold the English concept labels for the research team; `shownMatched` and
 * `shownMissing` hold the labels in the reply's language.
 */
export function assessTeachback(
  promptId: string,
  response: string,
  prompts: TeachPrompt[] = teachPrompts,
  speaker: Speaker = "participant",
  screenLanguage: Language = "en",
): TeachResult {
  const english = prompts.find((item) => item.id === promptId) ?? promptById(promptId);
  const practiceForm = teachPrompts.includes(english);
  const detected = detectLanguage(response);
  const language: Language = detected ?? (screenLanguage !== "en" && practiceForm ? screenLanguage : "en");
  const key = language !== "en" && practiceForm ? practicePrompt(language, promptId) : null;
  const text = normalize(response, speaker, language);
  const unsure = unsurePattern.test(text);
  const emptyGesture = gesturePattern.test(text);
  const base = { promptId, documentId: consentDoc.id, version: consentDoc.version, speaker, language };
  const words = feedbackText[language];

  if (language !== "en" && !key) {
    return {
      ...base,
      label: "Requires human follow-up",
      matched: [],
      missing: english.concepts.map((concept) => concept.label),
      feedback: noKey[language],
    };
  }

  const prompt = key ?? english;
  const inEnglish = (concepts: TeachPrompt["concepts"]) =>
    concepts.map((concept) => english.concepts.find((item) => item.id === concept.id)?.label ?? concept.label);
  const labels = (matchedConcepts: TeachPrompt["concepts"], missingConcepts: TeachPrompt["concepts"]) => ({
    matched: inEnglish(matchedConcepts),
    missing: inEnglish(missingConcepts),
    shownMatched: matchedConcepts.map((concept) => concept.label),
    shownMissing: missingConcepts.map((concept) => concept.label),
  });

  if (!text || unsure) {
    return { ...base, label: "Requires human follow-up", ...labels([], prompt.concepts), feedback: words.unsure };
  }

  const credited = (source: string) => prompt.concepts.filter((concept) => concept.phrases.some((phrase) => source.includes(stripAccents(phrase))));
  const matched = credited(text);
  const missing = prompt.concepts.filter((concept) => !matched.includes(concept));
  const found = locateMisconception(prompt, text, language);

  if (found) {
    const wrong = found.item;
    const englishWrong = english.misconceptions?.find((item) => item.id === wrong.id)?.label ?? wrong.label;
    const rightElsewhere = credited(withoutSentenceAt(text, found.index, language));
    return {
      ...base,
      label: "Needs clarification",
      ...labels(rightElsewhere, prompt.concepts.filter((concept) => !rightElsewhere.includes(concept))),
      misconception: englishWrong,
      shownMisconception: wrong.label,
      feedback: words.wrong(wrong.label, prompt.reexplain),
    };
  }

  if (emptyGesture || matched.length === 0) {
    const feedback = emptyGesture ? words.gesture(prompt.reexplain) : words.none(prompt.reexplain);
    return { ...base, label: "Needs clarification", ...labels([], prompt.concepts), feedback };
  }

  if (missing.length === 0) {
    return { ...base, label: "Understands the key concept", ...labels(matched, []), feedback: words.full };
  }

  return {
    ...base,
    label: "Partially understands",
    ...labels(matched, missing),
    feedback: words.partial(missing.map((concept) => concept.label.toLowerCase()).join(language === "zh" ? "；" : "; "), prompt.reexplain),
  };
}
