// Shared by the Vite dev server (vite.config.ts) and the Vercel Function (api/gemini.ts).
// Free-tier Gemini quotas are counted per model, so several models may be listed. When one
// returns 429 it is benched until its retry time and the next model is tried.

export const defaultModels = "gemini-3.5-flash,gemini-3-flash-preview,gemini-flash-latest,gemini-3.1-flash-lite";

export function parseModels(value: string | undefined): string[] {
  return (value || defaultModels).split(",").map((model) => model.trim()).filter(Boolean);
}

export type RelayResult = { status: number; body: string; model?: string };

export function createGeminiRelay(models: string[]) {
  const benchedUntil = new Map<string, number>();
  const available = () => models.filter((model) => (benchedUntil.get(model) ?? 0) <= Date.now());

  return {
    status(key: string) {
      return { configured: Boolean(key), model: available()[0] ?? models[0], models };
    },
    async generate(key: string, body: string): Promise<RelayResult> {
      if (!key) return { status: 503, body: JSON.stringify({ error: "GEMINI_API_KEY is not set" }) };
      for (const model of available()) {
        try {
          const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body,
            signal: AbortSignal.timeout(25_000),
          });
          const text = await upstream.text();
          if (upstream.status === 429) {
            const retry = Number(/"retryDelay":\s*"(\d+)s"/.exec(text)?.[1] ?? 60);
            benchedUntil.set(model, Date.now() + retry * 1000);
            continue;
          }
          return { status: upstream.status, body: text, model };
        } catch {
          return { status: 502, body: JSON.stringify({ error: "Gemini did not respond" }) };
        }
      }
      return { status: 429, body: JSON.stringify({ error: "Every configured Gemini model is at its free limit" }) };
    },
  };
}
