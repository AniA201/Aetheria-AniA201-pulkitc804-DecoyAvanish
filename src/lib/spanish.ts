// Spanish on the participant side: translating uploaded sections and answering Spanish questions.
// The English consent stays the source. Every machine translation must keep the source's numbers.
import { sectionsEs, stripAccents, teachPromptsEs, topicWordsEs } from "../data/studyEs";
import type { SectionId } from "../data/study";
import type { SavedQuestion } from "../state/Session";
import { runAgent, type AgentEnv, type AgentReply } from "./agent";
import type { SubmittedConsent } from "./consent";
import type { GeminiContent } from "./gemini";
import { structured } from "./llm";
import { looksSpanish, type TeachResult } from "./teachback";

/** The coordinator handoff in Spanish, built from this session only. */
export function localBriefingEs(input: { consent: SubmittedConsent; reviewed: string[]; saved: SavedQuestion[]; teach: TeachResult[] }) {
  const { consent, reviewed, saved, teach } = input;
  const title = (id: string, fallback: string) => (consent.sample ? sectionsEs[id as SectionId]?.title : undefined) ?? fallback;
  const topic = (id: string) => (consent.sample ? teachPromptsEs.find((prompt) => prompt.id === id)?.topic : undefined) ?? id;
  const read = consent.sections.filter((section) => reviewed.includes(section.id));
  const notRead = consent.sections.filter((section) => !reviewed.includes(section.id));
  const questions = [
    ...saved.filter((item) => !item.supported).map((item) => ({ text: item.question, reason: "La guardó y el formulario no la respondió." })),
    ...teach.flatMap((item) =>
      (item.shownMissing ?? item.missing).map((idea) => ({ text: `¿Me puede explicar esto: ${idea.toLowerCase()}?`, reason: `De Comprobar: ${topic(item.promptId)}` })),
    ),
    ...notRead.map((section) => ({ text: `¿Podemos repasar “${title(section.id, section.title)}” juntos?`, reason: "Todavía no está marcada como leída." })),
  ].slice(0, 8);
  return {
    summary: `Marcó ${read.length} de ${consent.sections.length} secciones como leídas, guardó ${saved.length} pregunta${saved.length === 1 ? "" : "s"} y comprobó ${teach.length} tema${teach.length === 1 ? "" : "s"}. Puede pedir un intérprete calificado para la conversación.`,
    questions,
    engine: "local" as const,
    note: "Armado en esta computadora a partir de esta sesión. No agrega datos del estudio.",
  };
}

const numbers = (text: string) => (text.match(/\d+(?:[.,]\d+)?/g) ?? []).map((value) => value.replace(",", "."));

/** True when every number in the source also appears in the translation. */
export function keepsNumbers(source: string, translated: string): boolean {
  const out = new Set(numbers(translated));
  return numbers(source).every((value) => out.has(value));
}

/** Spanish runs about 15–30% longer than English; a reply far outside that range added or dropped content. */
export function plausibleLength(source: string, translated: string): boolean {
  const a = source.trim().length;
  const b = translated.trim().length;
  return b >= a * 0.5 - 10 && b <= a * 1.7 + 15;
}

/** Numbers a translation adds that the source does not have. */
const addsNumbers = (source: string, translated: string) => {
  const own = new Set(numbers(source));
  return numbers(translated).some((value) => !own.has(value));
};

export function acceptTranslation(source: string, translated: unknown): string | null {
  if (typeof translated !== "string") return null;
  const out = translated.trim();
  if (!out || out === source.trim()) return null;
  return keepsNumbers(source, out) && !addsNumbers(source, out) && plausibleLength(source, out) ? out : null;
}

export type Translated = { engine: "gemini" | "ollama"; text: string } | { engine: "local"; note: string };

export async function translate(text: string, to: "es" | "en"): Promise<Translated> {
  const target = to === "es" ? "Spanish (Latin American, plain language, about a 6th-grade reading level, addressing the reader as usted)" : "English";
  const source = to === "es" ? "English" : "Spanish";
  const result = await structured(
    {
      system: `You translate ${source} into ${target}. The reply must be written in ${target}. Translate only; do not explain, expand, or answer it. A question stays a question. A heading stays a short heading. Keep every number, amount, and unit exactly. Do not add or remove facts. Return JSON {"text": "..."}.`,
      prompt: text,
      schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    },
    (value) => {
      const out = acceptTranslation(text, (value as { text?: unknown } | null)?.text);
      return out && to === "en" && looksSpanish(out) ? null : out;
    },
  );
  return result.engine === "local" ? { engine: "local", note: result.note } : { engine: result.engine, text: result.value };
}

const adviceWordsEs =
  /\b(dosis|miligramos?|mg|embarazada|embarazo|ibuprofeno|mis? medicamentos?|otros? medicamentos?|aprobad[oa]s?|aprobacion|fda|cura|curar|curarme|garantiza|garantia|mejor tratamiento|que tratamiento|(debo|deberia) (tomar|dejar|participar|entrar|unirme|firmar)|me conviene|me recomienda|recomienda|recomendaria)\b/;

/** Dose, personal treatment, approval, or cure questions, which the form cannot answer. */
export const asksForAdvice = (question: string) => adviceWordsEs.test(stripAccents(question.toLowerCase()));

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

/** Which topic a Spanish question is about, by keyword. */
export function spanishTopic(question: string): SectionId | null {
  const text = stripAccents(question.toLowerCase());
  const order: SectionId[] = ["costs", "rights", "privacy", "risks", "procedures"];
  return order.find((id) => topicWordsEs[id].test(text)) ?? null;
}

export type SpanishAnswer = {
  reply: AgentReply;
  englishQuestion: string;
  answerEs: string;
  how: string;
};

/**
 * A Spanish question: find its English meaning, answer it from the English form with the same agent,
 * then give the answer in Spanish. For the practice form the Spanish answer is the section's Spanish
 * reading (same figures as the form). For an uploaded form the answer is machine-translated and must
 * keep its numbers, or the English answer is shown with a note.
 */
export async function askInSpanish(question: string, consent: SubmittedConsent, env: AgentEnv, history: GeminiContent[]): Promise<SpanishAnswer> {
  if (asksForAdvice(question)) {
    return {
      reply: { answer: adviceRefusalEn, supported: false, quotes: [], steps: [{ tool: "guard", summary: "Checked the safety rules first" }], engine: "rules" },
      englishQuestion: question,
      how: "Regla de seguridad: Aetheria no da consejos médicos.",
      answerEs:
        "El formulario no responde esto. Aetheria no adivina una dosis, una decisión sobre su tratamiento, un estado de aprobación ni una cura. Pregunte a su médico o al coordinador del estudio, que puede ofrecerle un intérprete calificado.",
    };
  }
  const topic = spanishTopic(question);
  let englishQuestion = question;
  let how = "";
  const viaModel = await translate(question, "en");
  if (viaModel.engine !== "local") {
    englishQuestion = viaModel.text;
    how = `Pregunta traducida al inglés por ${viaModel.engine === "gemini" ? "Gemini" : "el modelo local"}: “${viaModel.text}”.`;
  } else if (topic) {
    englishQuestion = (consent.sample ? consent.sections.find((section) => section.id === topic)?.ask : undefined) ?? topicQuestionEn[topic];
    how = `Pregunta relacionada por palabras clave en español con: “${englishQuestion}”.`;
  } else {
    how = "No hay modelo de traducción disponible; se buscó la pregunta tal como se escribió.";
  }

  const reply = await runAgent(englishQuestion, env, history);
  const quote = reply.quotes[0];
  const supported = reply.fallbackAnswer ? reply.fallbackAnswer.supported : reply.supported && Boolean(quote);
  const answerSection = (quote?.sectionId ?? reply.fallbackAnswer?.sectionId ?? topic) as SectionId | null | undefined;
  const english = reply.fallbackAnswer?.answer ?? reply.answer;

  if (!supported) {
    return {
      reply,
      englishQuestion,
      how,
      answerEs:
        "El formulario no responde esto con claridad. Puede guardar la pregunta para el coordinador del estudio, que puede ofrecerle un intérprete calificado.",
    };
  }
  if (consent.sample && answerSection && sectionsEs[answerSection]) {
    return {
      reply,
      englishQuestion,
      how: `${how} Respuesta tomada de la lectura corta en español de “${sectionsEs[answerSection].title}”, con las mismas cifras del formulario.`.trim(),
      answerEs: `Según el formulario: ${sectionsEs[answerSection].plain}`,
    };
  }
  const translated = await translate(english, "es");
  if (translated.engine !== "local") {
    return { reply, englishQuestion, how: `${how} Respuesta traducida por ${translated.engine === "gemini" ? "Gemini" : "el modelo local"}; se comprobó que mantiene las cifras.`.trim(), answerEs: translated.text };
  }
  return {
    reply,
    englishQuestion,
    how: `${how} No hay modelo de traducción disponible, así que la respuesta se muestra en inglés.`.trim(),
    answerEs: `(Respuesta en inglés) ${english}`,
  };
}
