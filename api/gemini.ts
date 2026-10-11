// Vercel Function behind /gemini/status and /gemini/generate (see vercel.json). It does the job
// the Vite dev-server proxy does locally: the Gemini key stays here and never reaches the browser.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createGeminiRelay, parseModels } from "../server/gemini-relay.js";
import { teamSecrets } from "../server/team-secrets.js";

// GEMINI_API_KEY may be set directly in Vercel, or come from the encrypted .env.team
// when DOTENV_PRIVATE_KEY_TEAM is set in Vercel.
const team = teamSecrets();
const key = process.env.GEMINI_API_KEY || team.GEMINI_API_KEY || "";
const relay = createGeminiRelay(parseModels(process.env.GEMINI_MODEL || team.GEMINI_MODEL));

const json = (status: number, body: string, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });

export function GET() {
  // Yes/no setup hints only; no secret values.
  const setup = { teamFile: existsSync(join(process.cwd(), ".env.team")), decryptionKey: Boolean(process.env.DOTENV_PRIVATE_KEY_TEAM) };
  return json(200, JSON.stringify({ ...relay.status(key), setup }));
}

export async function POST(request: Request) {
  // Only this site's pages may use the relay, so the key cannot be used as an open Gemini proxy.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return json(403, JSON.stringify({ error: "Forbidden" }));
  const body = await request.text();
  if (body.length > 200_000) return json(413, JSON.stringify({ error: "Request too large" }));
  const result = await relay.generate(key, body);
  return json(result.status, result.body, result.model ? { "X-Gemini-Model": result.model } : {});
}
