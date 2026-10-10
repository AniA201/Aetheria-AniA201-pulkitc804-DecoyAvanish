// Browser side of the Gemini proxy in vite.config.ts. The key stays on the dev server.

export type GeminiPart = {
  text?: string;
  functionCall?: { name: string; id?: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; id?: string; response: Record<string, unknown> };
  thoughtSignature?: string;
};

export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

export type FunctionDeclaration = {
  name: string;
  description: string;
  parameters?: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[]; items?: { type: string } }>;
    required?: string[];
  };
};

export type GeminiStatus = { configured: boolean; model: string };

/** Why a Gemini call did not produce a usable reply. The router in llm.ts switches on this. */
export type GeminiFailure = "no-key" | "rate-limit" | "timeout" | "http" | "empty";

export type GeminiReply = { ok: true; content: GeminiContent } | { ok: false; failure: GeminiFailure; reason: string };

const failureText: Record<GeminiFailure, string> = {
  "no-key": "Gemini is not set up (no key).",
  "rate-limit": "Gemini's free limit was reached.",
  timeout: "Gemini did not answer in time.",
  http: "Gemini returned an error.",
  empty: "Gemini returned an empty reply.",
};

function failed(failure: GeminiFailure) {
  return { ok: false as const, failure, reason: failureText[failure] };
}

function failureFor(status: number): GeminiFailure {
  if (status === 429) return "rate-limit";
  if (status === 503) return "no-key";
  return "http";
}

export async function geminiStatus(): Promise<GeminiStatus> {
  try {
    const response = await fetch("/gemini/status", { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return { configured: false, model: "" };
    return (await response.json()) as GeminiStatus;
  } catch {
    return { configured: false, model: "" };
  }
}

export async function generate(request: {
  system: string;
  contents: GeminiContent[];
  tools: FunctionDeclaration[];
}): Promise<GeminiReply> {
  try {
    const response = await fetch("/gemini/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: request.contents,
        tools: [{ functionDeclarations: request.tools }],
        // Every turn must be a tool call, so the run always ends with final_answer.
        toolConfig: { functionCallingConfig: { mode: "ANY" } },
        // Gemini 3 is tuned for its default temperature, so none is set here.
      }),
    });
    if (!response.ok) return failed(failureFor(response.status));
    const body = (await response.json()) as { candidates?: { content?: GeminiContent }[] };
    const content = body.candidates?.[0]?.content;
    if (!content?.parts?.length) return failed("empty");
    return { ok: true, content: { role: "model", parts: content.parts } };
  } catch {
    return failed("timeout");
  }
}

let statusRequest: Promise<GeminiStatus> | null = null;

/** One status probe per page load, shared by every screen that uses Gemini. */
export function cachedGeminiStatus(): Promise<GeminiStatus> {
  statusRequest ??= geminiStatus();
  return statusRequest;
}

export type JsonSchema = {
  type: "object" | "array" | "string" | "boolean";
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: string[];
  nullable?: boolean;
  required?: string[];
  description?: string;
};

/** A single structured reply with no tools, for teach-back and the summary briefing. */
export async function generateJson(request: {
  system: string;
  prompt: string;
  schema: JsonSchema;
}): Promise<{ ok: true; value: unknown } | { ok: false; failure: GeminiFailure; reason: string }> {
  try {
    const response = await fetch("/gemini/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: request.schema },
      }),
    });
    if (!response.ok) return failed(failureFor(response.status));
    const body = (await response.json()) as { candidates?: { content?: GeminiContent }[] };
    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!text) return failed("empty");
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch {
      return failed("empty");
    }
  } catch {
    return failed("timeout");
  }
}
