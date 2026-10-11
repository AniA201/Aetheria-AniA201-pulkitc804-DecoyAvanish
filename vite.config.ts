import { existsSync, realpathSync } from "node:fs";
import { defineConfig, loadEnv, searchForWorkspaceRoot, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createGeminiRelay, parseModels } from "./server/gemini-relay";
import { teamSecrets } from "./server/team-secrets";

const ollamaProxy = {
  "/ollama": {
    target: "http://127.0.0.1:11434",
    rewrite: (path: string) => path.replace(/^\/ollama/, ""),
  },
};

const apiProxy = {
  "/api": {
    target: `http://127.0.0.1:${process.env.API_PORT || 8000}`,
  },
};

function geminiProxy(key: string, models: string[]): Plugin {
  const relay = createGeminiRelay(models);
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? "";
    if (!url.startsWith("/gemini/")) return next();
    const send = (status: number, body: string, model?: string) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      if (model) res.setHeader("X-Gemini-Model", model);
      res.end(body);
    };
    if (url === "/gemini/status" && req.method === "GET") return send(200, JSON.stringify(relay.status(key)));
    if (url !== "/gemini/generate" || req.method !== "POST") return send(404, JSON.stringify({ error: "Not found" }));
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 200_000) req.destroy();
      else chunks.push(chunk);
    });
    req.on("end", async () => {
      const result = await relay.generate(key, Buffer.concat(chunks).toString("utf8"));
      send(result.status, result.body, result.model);
    });
  };
  return {
    name: "aetheria-gemini-proxy",
    configureServer(server) {
      if (!key) server.config.logger.warn("Gemini is unavailable in this local server: set GEMINI_API_KEY in .env.local or add DOTENV_PRIVATE_KEY_TEAM in .env.keys to decrypt .env.team, then restart Vite.");
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}

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
    plugins: [react(), geminiProxy(env.GEMINI_API_KEY ?? "", parseModels(env.GEMINI_MODEL))],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: { ...ollamaProxy, ...apiProxy },
      // A worktree may link node_modules from another checkout. Allow its real path so imports
      // such as pdfjs-dist's worker (?url) are not denied by Vite's file-system guard.
      fs: { allow: [searchForWorkspaceRoot(process.cwd()), ...(existsSync("node_modules") ? [realpathSync("node_modules")] : [])] },
    },
    preview: { proxy: { ...ollamaProxy, ...apiProxy } },
  };
});
