// Spanish, French, and Mandarin on the participant side: translating uploaded sections and answering
// questions asked in those languages. The English consent stays the source. Every machine translation
// must keep the source's numbers, add none, and stay close to the expected length.
import { practice } from "../data/practiceLanguages";
import type { SectionId } from "../data/study";
import { stripAccents } from "../data/studyEs";
import type { SavedQuestion } from "../state/Session";
import { runAgent, type AgentEnv, type AgentReply } from "./agent";
import type { SubmittedConsent } from "./consent";
import type { GeminiContent } from "./gemini";
import { languageInfo, type Language, type OtherLanguage } from "./languages";
import { structured } from "./llm";
import { detectLanguage, type TeachResult } from "./teachback";

type Copy = {
  modelName: (engine: "gemini" | "ollama") => string;
  briefing: {
    unanswered: string;
    explain: (idea: string) => string;
    fromCheck: (topic: string) => string;
    review: (title: string) => string;
    notRead: string;
    summary: (read: number, total: number, saved: number, checked: number) => string;
    note: string;
  };
  refusal: string;
  refusalHow: string;
  unsupported: string;
  translatedQuestion: (model: string, text: string) => string;
  keywordQuestion: (text: string) => string;
  noModel: string;
  fromReading: (title: string) => string;
  formSays: (plain: string) => string;
  translatedAnswer: (model: string) => string;
  englishShown: string;
  englishPrefix: string;
};

const copy: Record<OtherLanguage, Copy> = {
  es: {
    modelName: (engine) => (engine === "gemini" ? "Gemini" : "el modelo local"),
    briefing: {
      unanswered: "La guardó y el formulario no la respondió.",
      explain: (idea) => `¿Me puede explicar esto: ${idea.toLowerCase()}?`,
      fromCheck: (topic) => `De Comprobar: ${topic}`,
      review: (title) => `¿Podemos repasar “${title}” juntos?`,
      notRead: "Todavía no está marcada como leída.",
      summary: (read, total, saved, checked) =>
        `Marcó ${read} de ${total} secciones como leídas, guardó ${saved} pregunta${saved === 1 ? "" : "s"} y comprobó ${checked} tema${checked === 1 ? "" : "s"}. Puede pedir un intérprete calificado para la conversación.`,
      note: "Armado en esta computadora a partir de esta sesión. No agrega datos del estudio.",
    },
    refusal:
      "El formulario no responde esto. Aetheria no adivina una dosis, una decisión sobre su tratamiento, un estado de aprobación ni una cura. Pregunte a su médico o al coordinador del estudio, que puede ofrecerle un intérprete calificado.",
    refusalHow: "Regla de seguridad: Aetheria no da consejos médicos.",
    unsupported: "El formulario no responde esto con claridad. Puede guardar la pregunta para el coordinador del estudio, que puede ofrecerle un intérprete calificado.",
    translatedQuestion: (model, text) => `Pregunta traducida al inglés por ${model}: “${text}”.`,
    keywordQuestion: (text) => `Pregunta relacionada por palabras clave en español con: “${text}”.`,
    noModel: "No hay modelo de traducción disponible; se buscó la pregunta tal como se escribió.",
    fromReading: (title) => `Respuesta tomada de la lectura corta en español de “${title}”, con las mismas cifras del formulario.`,
    formSays: (plain) => `Según el formulario: ${plain}`,
    translatedAnswer: (model) => `Respuesta traducida por ${model}; se comprobó que mantiene las cifras.`,
    englishShown: "No hay modelo de traducción disponible, así que la respuesta se muestra en inglés.",
    englishPrefix: "(Respuesta en inglés)",
  },
  fr: {
    modelName: (engine) => (engine === "gemini" ? "Gemini" : "le modèle local"),
    briefing: {
      unanswered: "Vous l'avez enregistrée et le formulaire n'y a pas répondu.",
      explain: (idea) => `Pouvez-vous m'expliquer ceci : ${idea.toLowerCase()} ?`,
      fromCheck: (topic) => `Depuis Vérifier : ${topic}`,
      review: (title) => `Pouvons-nous revoir « ${title} » ensemble ?`,
      notRead: "Pas encore marquée comme lue.",
      summary: (read, total, saved, checked) =>
        `Vous avez marqué ${read} sur ${total} sections comme lues, enregistré ${saved} question${saved > 1 ? "s" : ""} et vérifié ${checked} sujet${checked > 1 ? "s" : ""}. Vous pouvez demander un interprète qualifié pour la conversation.`,
      note: "Préparé sur cet ordinateur à partir de cette session. N'ajoute aucune donnée de l'étude.",
    },
    refusal:
      "Le formulaire ne répond pas à cela. Aetheria ne devine pas une dose, une décision sur votre traitement, un statut d'approbation ou une guérison. Demandez à votre médecin ou au coordinateur de l'étude, qui peut vous proposer un interprète qualifié.",
    refusalHow: "Règle de sécurité : Aetheria ne donne pas de conseils médicaux.",
    unsupported: "Le formulaire ne répond pas clairement à cela. Vous pouvez enregistrer la question pour le coordinateur de l'étude, qui peut vous proposer un interprète qualifié.",
    translatedQuestion: (model, text) => `Question traduite en anglais par ${model} : « ${text} ».`,
    keywordQuestion: (text) => `Question reliée par mots-clés en français à : « ${text} ».`,
    noModel: "Aucun modèle de traduction n'est disponible ; la question a été cherchée telle qu'elle a été écrite.",
    fromReading: (title) => `Réponse tirée de la lecture courte en français de « ${title} », avec les mêmes chiffres que le formulaire.`,
    formSays: (plain) => `Selon le formulaire : ${plain}`,
    translatedAnswer: (model) => `Réponse traduite par ${model} ; les chiffres ont été vérifiés.`,
    englishShown: "Aucun modèle de traduction n'est disponible, donc la réponse est affichée en anglais.",
    englishPrefix: "(Réponse en anglais)",
  },
  zh: {
    modelName: (engine) => (engine === "gemini" ? "Gemini" : "本地模型"),
    briefing: {
      unanswered: "您保存了这个问题，表格没有回答。",
      explain: (idea) => `能给我解释一下这一点吗：${idea}？`,
      fromCheck: (topic) => `来自“检查”：${topic}`,
      review: (title) => `我们可以一起复习“${title}”吗？`,
      notRead: "还没有标记为已读。",
      summary: (read, total, saved, checked) =>
        `您已将 ${total} 个部分中的 ${read} 个标记为已读，保存了 ${saved} 个问题，检查了 ${checked} 个主题。您可以要求在谈话时提供合格的口译员。`,
      note: "在这台电脑上根据本次会话整理，没有添加研究数据。",
    },
    refusal: "表格没有回答这个问题。Aetheria 不会猜测剂量、关于您治疗的决定、批准状态或治愈。请询问您的医生或研究协调员，他们可以为您提供合格的口译员。",
    refusalHow: "安全规则：Aetheria 不提供医疗建议。",
    unsupported: "表格没有清楚回答这个问题。您可以把问题保存给研究协调员，他们可以为您提供合格的口译员。",
    translatedQuestion: (model, text) => `问题由${model}翻译成英文：“${text}”。`,
    keywordQuestion: (text) => `根据中文关键词对应到：“${text}”。`,
    noModel: "没有可用的翻译模型，所以按原文搜索了这个问题。",
    fromReading: (title) => `回答取自“${title}”的中文简短说明，数字与表格相同。`,
    formSays: (plain) => `根据表格：${plain}`,
    translatedAnswer: (model) => `回答由${model}翻译，已核对数字。`,
    englishShown: "没有可用的翻译模型，所以回答以英文显示。",
    englishPrefix: "（英文回答）",
  },
};

/** The coordinator handoff in a non-English screen language, built from this session only. */
export function localBriefingIn(language: OtherLanguage, input: { consent: SubmittedConsent; reviewed: string[]; saved: SavedQuestion[]; teach: TeachResult[] }) {
  const { consent, reviewed, saved, teach } = input;
  const words = copy[language].briefing;
  const local = practice[language];
  const title = (id: string, fallback: string) => (consent.sample ? local.sections[id as SectionId]?.title : undefined) ?? fallback;
  const topic = (id: string) => (consent.sample ? local.prompts.find((prompt) => prompt.id === id)?.topic : undefined) ?? id;
  const read = consent.sections.filter((section) => reviewed.includes(section.id));
  const notRead = consent.sections.filter((section) => !reviewed.includes(section.id));
  const questions = [
    ...saved.filter((item) => !item.supported).map((item) => ({ text: item.question, reason: words.unanswered })),
    ...teach.flatMap((item) => (item.shownMissing ?? item.missing).map((idea) => ({ text: words.explain(idea), reason: words.fromCheck(topic(item.promptId)) }))),
    ...notRead.map((section) => ({ text: words.review(title(section.id, section.title)), reason: words.notRead })),
  ].slice(0, 8);
  return {
    summary: words.summary(read.length, consent.sections.length, saved.length, teach.length),
    questions,
    engine: "local" as const,
    note: words.note,
  };
}
const numbers = (text: string) => (text.match(/\d+(?:[.,]\d+)?/g) ?? []).map((value) => value.replace(",", "."));

/** True when every number in the source also appears in the translation. */
export function keepsNumbers(source: string, translated: string): boolean {
  const out = new Set(numbers(translated));
  return numbers(source).every((value) => out.has(value));
}

/** Characters per English character: Spanish and French run longer, Chinese much shorter. */
const lengthFactor: Record<Language, number> = { en: 1, es: 1.2, fr: 1.2, zh: 0.35 };

/** A translation far outside the expected length added or dropped content. */
export function plausibleLength(source: string, translated: string, from: Language = "en", to: Language = "es"): boolean {
  const a = source.trim().length;
  const b = translated.trim().length;
  const factor = lengthFactor[to] / lengthFactor[from];
  return b >= a * factor * 0.4 - 10 && b <= a * factor * 1.6 + 15;
}

/** Numbers a translation adds that the source does not have. */
const addsNumbers = (source: string, translated: string) => {
  const own = new Set(numbers(source));
  return numbers(translated).some((value) => !own.has(value));
};

/** True when the text is written in `language`, as far as a quick look can tell. */
function writtenIn(text: string, language: Language): boolean {
  const detected = detectLanguage(text);
  if (language === "zh") return detected === "zh";
  if (language === "en") return detected === null;
  return detected === null || detected === language;
}

export function acceptTranslation(source: string, translated: unknown, from: Language = "en", to: Language = "es"): string | null {
  if (typeof translated !== "string") return null;
  const out = translated.trim();
  if (!out || out === source.trim()) return null;
  if (!keepsNumbers(source, out) || addsNumbers(source, out) || !plausibleLength(source, out, from, to)) return null;
  return writtenIn(out, to) ? out : null;
}

export type Translated = { engine: "gemini" | "ollama"; text: string } | { engine: "local"; note: string };

const targetDescription: Record<Language, string> = {
  en: "English",
  es: "Spanish (Latin American, plain language, about a 6th-grade reading level, addressing the reader as usted)",
  fr: "French (plain language, about a 6th-grade reading level, addressing the reader as vous)",
  zh: "Mandarin Chinese in Simplified characters (plain language, addressing the reader as 您, Arabic digits for every number)",
};

export async function translate(text: string, from: Language, to: Language): Promise<Translated> {
  const result = await structured(
    {
      system: `You translate ${languageInfo[from].english} into ${targetDescription[to]}. The reply must be written in ${languageInfo[to].english}. Translate only; do not explain, expand, or answer it. A question stays a question. A heading stays a short heading. Keep every number, amount, and unit exactly, written with the same digits. Do not add or remove facts. Return JSON {"text": "..."}.`,
      prompt: text,
      schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    },
    (value) => acceptTranslation(text, (value as { text?: unknown } | null)?.text, from, to),
  );
  return result.engine === "local" ? { engine: "local", note: result.note } : { engine: result.engine, text: result.value };
}

const matchable = (question: string, language: OtherLanguage) => (language === "zh" ? question.toLowerCase().replace(/\s+/g, "") : stripAccents(question.toLowerCase()));

/** Dose, personal treatment, approval, or cure questions, which the form cannot answer. */
export const asksForAdvice = (question: string, language: OtherLanguage = "es") => practice[language].adviceWords.test(matchable(question, language));

const adviceRefusalEn =
  "The consent form does not answer that. Aetheria will not guess a dose, a personal treatment decision, an approval status, or a cure. Please ask the research coordinator.";

/** A general English question per topic, used to search any form when no model can translate. */
const topicQuestionEn: Record<SectionId, string> = {
  procedures: "How many visits are there, and how long will I be in the study?",
  risks: "What are the risks and side effects?",
  rights: "Can I leave or withdraw from the study?",
  costs: "Will I be paid, and will the study cost me anything?",
  privacy: "Who can see my information and records?",
};

/** Which topic a question is about, by keyword. Specific topics are checked before visits, which is the most general. */
export function topicOf(question: string, language: OtherLanguage = "es"): SectionId | null {
  const text = matchable(question, language);
  const order: SectionId[] = ["costs", "rights", "privacy", "risks", "procedures"];
  return order.find((id) => practice[language].topicWords[id].test(text)) ?? null;
}
export type LocalizedAnswer = {
  reply: AgentReply;
  englishQuestion: string;
  answer: string;
  how: string;
};

/**
 * A question in Spanish, French, or Mandarin: find its English meaning, answer it from the English
 * form with the same agent, then give the answer in the question's language. For the practice form
 * the answer is the section's written reading (same figures as the form). For an uploaded form the
 * answer is machine-translated and must keep its numbers, or the English answer is shown with a note.
 */
export async function askIn(language: OtherLanguage, question: string, consent: SubmittedConsent, env: AgentEnv, history: GeminiContent[]): Promise<LocalizedAnswer> {
  const words = copy[language];
  if (asksForAdvice(question, language)) {
    return {
      reply: { answer: adviceRefusalEn, supported: false, quotes: [], steps: [{ tool: "guard", summary: "Checked the safety rules first" }], engine: "rules" },
      englishQuestion: question,
      how: words.refusalHow,
      answer: words.refusal,
    };
  }
  const topic = topicOf(question, language);
  let englishQuestion = question;
  let how = "";
  const viaModel = await translate(question, language, "en");
  if (viaModel.engine !== "local") {
    englishQuestion = viaModel.text;
    how = words.translatedQuestion(words.modelName(viaModel.engine), viaModel.text);
  } else if (topic) {
    englishQuestion = (consent.sample ? consent.sections.find((section) => section.id === topic)?.ask : undefined) ?? topicQuestionEn[topic];
    how = words.keywordQuestion(englishQuestion);
  } else {
    how = words.noModel;
  }

  const reply = await runAgent(englishQuestion, env, history);
  const quote = reply.quotes[0];
  const supported = reply.fallbackAnswer ? reply.fallbackAnswer.supported : reply.supported && Boolean(quote);
  const answerSection = (quote?.sectionId ?? reply.fallbackAnswer?.sectionId ?? topic) as SectionId | null | undefined;
  const english = reply.fallbackAnswer?.answer ?? reply.answer;
  const reading = consent.sample && answerSection ? practice[language].sections[answerSection] : undefined;

  if (!supported) return { reply, englishQuestion, how, answer: words.unsupported };
  if (reading) return { reply, englishQuestion, how: `${how} ${words.fromReading(reading.title)}`.trim(), answer: words.formSays(reading.plain) };
  const translated = await translate(english, "en", language);
  if (translated.engine !== "local") {
    return { reply, englishQuestion, how: `${how} ${words.translatedAnswer(words.modelName(translated.engine))}`.trim(), answer: translated.text };
  }
  return { reply, englishQuestion, how: `${how} ${words.englishShown}`.trim(), answer: `${words.englishPrefix} ${english}` };
}
