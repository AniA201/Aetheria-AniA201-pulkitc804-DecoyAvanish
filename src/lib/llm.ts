// Which engine answers. Order: Gemini (cloud, free tier) → local RAG (retrieval + Ollama) → rules.
// Every engine's output goes through the same checks, so a fallback is never less safe.
import { generateJson, type GeminiFailure, type JsonSchema } from "./gemini";
import { completeJson } from "./ollama";

export type Engine = "gemini" | "ollama" | "local";

const rateLimitPause = 60_000;
let geminiPausedUntil = 0;
let geminiMissing = false;

/** False while Gemini has no key or is cooling down after its free limit. */
export function geminiAvailable(now = Date.now()): boolean {
  return !geminiMissing && now >= geminiPausedUntil;
}

export function geminiPauseNote(now = Date.now()): string {
  if (geminiMissing) return "Gemini is not set up, so this was answered on this computer.";
  const seconds = Math.max(1, Math.ceil((geminiPausedUntil - now) / 1000));
  return `Gemini's free limit was reached. Answered on this computer; Gemini is tried again in ${seconds}s.`;
}

/** Records why Gemini failed and decides whether to keep asking it. */
export function noteGeminiFailure(failure: GeminiFailure, now = Date.now()): string {
  switch (failure) {
    case "no-key":
      geminiMissing = true;
      return "Gemini is not set up, so this was answered on this computer.";
    case "rate-limit":
      geminiPausedUntil = now + rateLimitPause;
      return "Gemini's free limit was reached, so this was answered on this computer.";
    case "timeout":
      return "Gemini did not answer in time, so this was answered on this computer.";
    case "empty":
    case "http":
      return "Gemini returned an unusable reply, so this was answered on this computer.";
  }
}

export function resetEngines() {
  geminiPausedUntil = 0;
  geminiMissing = false;
}

export type StructuredResult = { engine: Exclude<Engine, "local">; value: unknown } | { engine: "local"; note: string };

/**
 * Gemini first, then the local model with the same schema. Each candidate must pass `accept`
 * before it is used; if none does, the caller's rules answer.
 */
export async function structured<T>(
  request: { system: string; prompt: string; schema: JsonSchema },
  accept: (value: unknown) => T | null,
): Promise<{ engine: Exclude<Engine, "local">; value: T } | { engine: "local"; note: string }> {
  let note = geminiAvailable() ? "" : geminiPauseNote();
  if (geminiAvailable()) {
    const gemini = await generateJson(request);
    if (gemini.ok) {
      const value = accept(gemini.value);
      if (value) return { engine: "gemini", value };
      note = "Gemini's reply did not pass the checks.";
    } else {
      note = noteGeminiFailure(gemini.failure);
    }
  }
  const local = accept(await completeJson(request));
  if (local) return { engine: "ollama", value: local };
  return { engine: "local", note: note || "Answered on this computer." };
}
