import { consentDoc, teachPrompts, type TeachPrompt } from "../data/study";
import { stripAccents, teachPromptsEs } from "../data/studyEs";

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
  language?: "en" | "es";
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

/** A rough guess that a reply is in Spanish, used to pick the Spanish answer key or route the reply to a person. */
export function looksSpanish(response: string): boolean {
  const hits = response.match(spanishWords)?.length ?? 0;
  return hits >= 3 || /[ñ¿¡]/.test(response) || (hits >= 2 && /[áéíóú]/i.test(response));
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
    .replace(/\bno paga\b/g, "no pago");
}

function normalize(response: string, speaker: Speaker): string {
  const text = stripAccents(response.trim().toLowerCase().replace(/[’‘]/g, "'"));
  return speaker === "caregiver" ? asParticipant(text) : text;
}

function negatedBefore(text: string, index: number): boolean {
  if (/\b(not|never|isn't|aren't|won't|don't|doesn't|no one|nobody|no|nunca|nadie)\s+(\w+\s+)?$/.test(text.slice(Math.max(0, index - 20), index))) return true;
  // "does not promise that it will cure", "no promete que me va a curar"
  return /\b(not|doesn't|don't|no|nunca)\s+(promise|promises|guarantee|guarantees|say|says|mean|means|promete|garantiza|dice|asegura|significa)\s+(that\s+|que\s+)?(\w+\s+){0,2}$/.test(
    text.slice(Math.max(0, index - 40), index),
  );
}

/** The Spanish answer key for a prompt, when one exists (the five practice sections). */
export function spanishPrompt(promptId: string): TeachPrompt | null {
  return teachPromptsEs.find((item) => item.id === promptId) ?? null;
}

export function findMisconception(prompt: TeachPrompt, text: string) {
  return locateMisconception(prompt, text)?.item ?? null;
}

function locateMisconception(prompt: TeachPrompt, text: string) {
  for (const item of prompt.misconceptions ?? []) {
    for (const phrase of item.phrases) {
      const index = text.indexOf(phrase);
      if (index >= 0 && !negatedBefore(text, index)) return { item, index };
    }
  }
  return null;
}

/** The text without the sentence that holds `index`, so words inside a wrong statement are not credited. */
function withoutSentenceAt(text: string, index: number): string {
  const start = Math.max(text.lastIndexOf(".", index), text.lastIndexOf(";", index), text.lastIndexOf("!", index), text.lastIndexOf("?", index)) + 1;
  const ends = [".", ";", "!", "?"].map((mark) => text.indexOf(mark, index)).filter((at) => at >= 0);
  const end = ends.length ? Math.min(...ends) : text.length;
  return `${text.slice(0, start)} ${text.slice(end)}`;
}

const feedbackText = {
  en: {
    unsure:
      "That is a good moment to talk with the research coordinator. There is no score to pass. The ideas to cover are listed here if you want to try again.",
    wrong: (label: string, reexplain: string) => `This reply suggests ${label}. The form says otherwise. ${reexplain}`,
    gesture: (reexplain: string) => `A short yes does not have to stand in for the details. ${reexplain}`,
    full: "Your words cover the ideas this question is looking for. You can still ask the coordinator to walk through it with you.",
    partial: (missing: string, reexplain: string) => `You covered part of it. Still worth naming: ${missing}. ${reexplain}`,
  },
  es: {
    unsure:
      "Es un buen momento para hablar con el coordinador del estudio. No hay una nota que aprobar. Abajo están las ideas por si quiere intentarlo otra vez.",
    wrong: (label: string, reexplain: string) => `Esta respuesta sugiere ${label}. El formulario dice otra cosa. ${reexplain}`,
    gesture: (reexplain: string) => `Un sí corto no reemplaza los detalles. ${reexplain}`,
    full: "Sus palabras cubren las ideas que busca esta pregunta. Igual puede pedirle al coordinador que se lo explique.",
    partial: (missing: string, reexplain: string) => `Cubrió una parte. Falta mencionar: ${missing}. ${reexplain}`,
  },
};

/**
 * Checks a reply against the answer key, in English or Spanish.
 * Spanish is used when the screen is in Spanish or the reply reads as Spanish. Only the five practice
 * sections have a Spanish answer key; a Spanish reply to an uploaded form goes to a person.
 * `matched` and `missing` hold the English concept labels for the research team; `shownMatched` and
 * `shownMissing` hold the labels in the reply's language.
 */
export function assessTeachback(
  promptId: string,
  response: string,
  prompts: TeachPrompt[] = teachPrompts,
  speaker: Speaker = "participant",
  screenLanguage: "en" | "es" = "en",
): TeachResult {
  const english = prompts.find((item) => item.id === promptId) ?? promptById(promptId);
  const text = normalize(response, speaker);
  const writtenInSpanish = looksSpanish(response);
  const spanishKey = teachPrompts.includes(english) ? spanishPrompt(promptId) : null;
  const spanish = writtenInSpanish || (screenLanguage === "es" && spanishKey !== null);
  const language: "en" | "es" = spanish ? "es" : "en";
  const unsure = /^(i don'?t know|do not know|not sure|no idea|idk|no se|no lo se|ni idea)\.?$/i.test(text);
  const emptyGesture = /^(yes|ok|okay|i understand|i consent|i agree|sure|si|entiendo|acepto|de acuerdo|claro)\.?$/i.test(text);
  const base = { promptId, documentId: consentDoc.id, version: consentDoc.version, speaker, language };
  const words = feedbackText[language];

  if (spanish && !spanishKey) {
    return {
      ...base,
      label: "Requires human follow-up",
      matched: [],
      missing: english.concepts.map((concept) => concept.label),
      feedback:
        "Esta respuesta está en español y este formulario no tiene una guía de respuestas en español. Una persona que hable español, o un intérprete calificado, debe repasar este tema con usted.",
    };
  }

  const prompt = spanish && spanishKey ? spanishKey : english;
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
  const found = locateMisconception(prompt, text);

  if (found) {
    const wrong = found.item;
    const englishWrong = english.misconceptions?.find((item) => item.id === wrong.id)?.label ?? wrong.label;
    const rightElsewhere = credited(withoutSentenceAt(text, found.index));
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
    return { ...base, label: "Needs clarification", ...labels([], prompt.concepts), feedback: words.gesture(prompt.reexplain) };
  }

  if (missing.length === 0) {
    return { ...base, label: "Understands the key concept", ...labels(matched, []), feedback: words.full };
  }

  return {
    ...base,
    label: "Partially understands",
    ...labels(matched, missing),
    feedback: words.partial(missing.map((concept) => concept.label.toLowerCase()).join("; "), prompt.reexplain),
  };
}
