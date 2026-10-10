import { teachPrompts, type TeachPrompt } from "../data/study";

export type Understanding =
  | "Understands the key concept"
  | "Partially understands"
  | "Needs clarification"
  | "Requires human follow-up";

export type TeachResult = {
  promptId: string;
  label: Understanding;
  matched: string[];
  missing: string[];
  feedback: string;
};

function promptById(id: string): TeachPrompt {
  const prompt = teachPrompts.find((item) => item.id === id);
  if (!prompt) {
    throw new Error(`Unknown teach-back prompt ${id}`);
  }
  return prompt;
}

export function assessTeachback(promptId: string, response: string): TeachResult {
  const prompt = promptById(promptId);
  const text = response.trim().toLowerCase();
  const unsure = /^(i don'?t know|do not know|not sure|no idea|idk)\.?$/i.test(response.trim());
  const emptyGesture = /^(yes|ok|okay|i understand|i consent|i agree|sure)\.?$/i.test(response.trim());

  if (!text || unsure) {
    return {
      promptId,
      label: "Requires human follow-up",
      matched: [],
      missing: prompt.concepts.map((concept) => concept.label),
      feedback:
        "That is a good moment to talk with the research coordinator. There is no score to pass. The ideas to cover are listed here if you want to try again.",
    };
  }

  const matched = prompt.concepts.filter((concept) =>
    concept.phrases.some((phrase) => text.includes(phrase)),
  );
  const missing = prompt.concepts.filter((concept) => !matched.includes(concept));

  if (emptyGesture || matched.length === 0) {
    return {
      promptId,
      label: "Needs clarification",
      matched: [],
      missing: prompt.concepts.map((concept) => concept.label),
      feedback: `A short yes does not have to stand in for the details. ${prompt.reexplain}`,
    };
  }

  if (missing.length === 0) {
    return {
      promptId,
      label: "Understands the key concept",
      matched: matched.map((concept) => concept.label),
      missing: [],
      feedback:
        "Your words cover the ideas this question is looking for. You can still ask the coordinator to walk through it with you.",
    };
  }

  return {
    promptId,
    label: "Partially understands",
    matched: matched.map((concept) => concept.label),
    missing: missing.map((concept) => concept.label),
    feedback: `You covered part of it. Still worth naming: ${missing
      .map((concept) => concept.label.toLowerCase())
      .join("; ")}. ${prompt.reexplain}`,
  };
}
