import { consentDoc, teachPrompts, type TeachPrompt } from "../data/study";

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

const spanishWords = /\b(el|la|los|las|del|que|puedo|puede|estudio|médico|medico|cualquier|momento|salir|pagan|nombre|también|pero|porque|sí|está|estoy)\b/gi;

/** A rough guess that a reply is in Spanish. Only used to route the reply to a person. */
export function looksSpanish(response: string): boolean {
  const hits = response.match(spanishWords)?.length ?? 0;
  return hits >= 3 || /[ñ¿¡]/.test(response);
}

/** A caregiver says "she can leave". Read it as "I can leave" so the same ideas are found. */
export function asParticipant(response: string): string {
  return response
    .replace(/\b(she|he|they)\b/gi, "i")
    .replace(/\b(her|his|their)\b/gi, "my")
    .replace(/\b(him|them)\b/gi, "me");
}

function normalize(response: string, speaker: Speaker): string {
  const text = response.trim().toLowerCase().replace(/[’‘]/g, "'");
  return speaker === "caregiver" ? asParticipant(text) : text;
}

function negatedBefore(text: string, index: number): boolean {
  return /\b(not|never|isn't|aren't|won't|don't|doesn't|no one|nobody)\s+(\w+\s+)?$/.test(text.slice(Math.max(0, index - 20), index));
}

export function findMisconception(prompt: TeachPrompt, text: string) {
  for (const item of prompt.misconceptions ?? []) {
    for (const phrase of item.phrases) {
      const index = text.indexOf(phrase);
      if (index >= 0 && !negatedBefore(text, index)) return item;
    }
  }
  return null;
}

export function assessTeachback(
  promptId: string,
  response: string,
  prompts: TeachPrompt[] = teachPrompts,
  speaker: Speaker = "participant",
): TeachResult {
  const prompt = prompts.find((item) => item.id === promptId) ?? promptById(promptId);
  const text = normalize(response, speaker);
  const unsure = /^(i don'?t know|do not know|not sure|no idea|idk)\.?$/i.test(response.trim());
  const emptyGesture = /^(yes|ok|okay|i understand|i consent|i agree|sure)\.?$/i.test(response.trim());
  const base = { promptId, documentId: consentDoc.id, version: consentDoc.version, speaker };

  if (!text || unsure) {
    return {
      ...base,
      label: "Requires human follow-up",
      matched: [],
      missing: prompt.concepts.map((concept) => concept.label),
      feedback:
        "That is a good moment to talk with the research coordinator. There is no score to pass. The ideas to cover are listed here if you want to try again.",
    };
  }

  if (looksSpanish(response)) {
    return {
      ...base,
      label: "Requires human follow-up",
      matched: [],
      missing: prompt.concepts.map((concept) => concept.label),
      language: "es",
      feedback:
        "This reply looks like Spanish. There is no reviewed Spanish consent form or Spanish check here, so a person who speaks Spanish, or a qualified interpreter, should go over this topic with you.",
    };
  }

  const matched = prompt.concepts.filter((concept) => concept.phrases.some((phrase) => text.includes(phrase)));
  const missing = prompt.concepts.filter((concept) => !matched.includes(concept));
  const wrong = findMisconception(prompt, text);

  if (wrong) {
    return {
      ...base,
      label: "Needs clarification",
      matched: matched.map((concept) => concept.label),
      missing: missing.map((concept) => concept.label),
      misconception: wrong.label,
      feedback: `This reply suggests ${wrong.label}. The form says otherwise. ${prompt.reexplain}`,
    };
  }

  if (emptyGesture || matched.length === 0) {
    return {
      ...base,
      label: "Needs clarification",
      matched: [],
      missing: prompt.concepts.map((concept) => concept.label),
      feedback: `A short yes does not have to stand in for the details. ${prompt.reexplain}`,
    };
  }

  if (missing.length === 0) {
    return {
      ...base,
      label: "Understands the key concept",
      matched: matched.map((concept) => concept.label),
      missing: [],
      feedback:
        "Your words cover the ideas this question is looking for. You can still ask the coordinator to walk through it with you.",
    };
  }

  return {
    ...base,
    label: "Partially understands",
    matched: matched.map((concept) => concept.label),
    missing: missing.map((concept) => concept.label),
    feedback: `You covered part of it. Still worth naming: ${missing
      .map((concept) => concept.label.toLowerCase())
      .join("; ")}. ${prompt.reexplain}`,
  };
}
