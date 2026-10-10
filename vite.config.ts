import { config as decryptEnv } from "@dotenvx/dotenvx";
import { defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Team secrets live encrypted in .env.team (committed). The decryption key is DOTENV_PRIVATE_KEY_TEAM,
// read from the git-ignored .env.keys or the environment. Without it, values stay encrypted and are ignored.
function teamSecrets(): Record<string, string> {
  const values: Record<string, string> = {};
  decryptEnv({ path: ".env.team", envKeysFile: ".env.keys", processEnv: values, quiet: true, ignore: ["MISSING_ENV_FILE", "MISSING_PRIVATE_KEY", "DECRYPTION_FAILED"] });
  return Object.fromEntries(Object.entries(values).filter(([, value]) => !value.startsWith("encrypted:")));
}

const ollamaProxy = {
  "/ollama": {
    target: "http://127.0.0.1:11434",
    rewrite: (path: string) => path.replace(/^\/ollama/, ""),
  },
};

const apiProxy = {
  "/api": {
    target: "http://127.0.0.1:8000",
  },
};

// Free-tier Gemini quotas are counted per model, so GEMINI_MODEL may list several models.
// When one returns 429, it is benched until its retry time and the next model is tried.
function geminiProxy(key: string, models: string[]): Plugin {
  const benchedUntil = new Map<string, number>();
  const nextModels = () => models.filter((model) => (benchedUntil.get(model) ?? 0) <= Date.now());

  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? "";
    if (!url.startsWith("/gemini/")) return next();
    const send = (status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    };
    if (url === "/gemini/status" && req.method === "GET") {
      return send(200, { configured: Boolean(key), model: nextModels()[0] ?? models[0], models });
    }
    if (url !== "/gemini/generate" || req.method !== "POST") return send(404, { error: "Not found" });
    if (!key) return send(503, { error: "GEMINI_API_KEY is not set" });

    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 200_000) req.destroy();
      else chunks.push(chunk);
    });
    req.on("end", async () => {
      const body = Buffer.concat(chunks).toString("utf8");
      for (const model of nextModels()) {
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
          res.statusCode = upstream.status;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("X-Gemini-Model", model);
          return res.end(text);
        } catch {
          return send(502, { error: "Gemini did not respond" });
        }
      }
      send(429, { error: "Every configured Gemini model is at its free limit" });
    });
  };
  return { name: "aetheria-gemini-proxy", configureServer(server) { server.middlewares.use(handler); }, configurePreviewServer(server) { server.middlewares.use(handler); } };
}

const defaultModels = "gemini-3.5-flash,gemini-3-flash-preview,gemini-flash-latest,gemini-3.1-flash-lite";

export default defineConfig(({ mode }) => {
  const team = teamSecrets();
  const local = Object.fromEntries(Object.entries(loadEnv(mode, process.cwd(), "")).filter(([, value]) => value));
  // Publishable browser values (VITE_*, such as the Supabase URL and publishable key) from the team
  // file are handed to Vite. A value set in your own .env / .env.local still wins.
  for (const [name, value] of Object.entries(team)) {
    if (name.startsWith("VITE_") && !local[name]) process.env[name] = value;
  }
  // Server-only values (Gemini) never get a VITE_ prefix and stay on the dev server.
  const env = { ...team, ...local };
  return {
    plugins: [react(), geminiProxy(env.GEMINI_API_KEY ?? "", (env.GEMINI_MODEL || defaultModels).split(",").map((model) => model.trim()).filter(Boolean))],
    server: { host: "0.0.0.0", port: 5173, proxy: { ...ollamaProxy, ...apiProxy } },
    preview: { proxy: { ...ollamaProxy, ...apiProxy } },
  };
});
