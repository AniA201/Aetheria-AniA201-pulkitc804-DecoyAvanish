import { defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const ollamaProxy = {
  "/ollama": {
    target: "http://127.0.0.1:11434",
    rewrite: (path: string) => path.replace(/^\/ollama/, ""),
  },
};

// The Gemini key is read on the dev server only. It has no VITE_ prefix, so it never
// reaches the browser bundle. The page posts a request body and this adds the key.
function geminiProxy(key: string, model: string): Plugin {
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? "";
    if (!url.startsWith("/gemini/")) return next();
    const send = (status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    };
    if (url === "/gemini/status" && req.method === "GET") {
      return send(200, { configured: Boolean(key), model });
    }
    if (url !== "/gemini/generate" || req.method !== "POST") return send(404, { error: "Not found" });
    if (!key) return send(503, { error: "GEMINI_API_KEY is not set in .env.local" });

    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 200_000) req.destroy();
      else chunks.push(chunk);
    });
    req.on("end", async () => {
      try {
        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: Buffer.concat(chunks).toString("utf8"),
            signal: AbortSignal.timeout(25_000),
          },
        );
        res.statusCode = upstream.status;
        res.setHeader("Content-Type", "application/json");
        res.end(await upstream.text());
      } catch {
        send(502, { error: "Gemini did not respond" });
      }
    });
  };
  return {
    name: "aetheria-gemini-proxy",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), geminiProxy(env.GEMINI_API_KEY ?? "", env.GEMINI_MODEL || "gemini-3-flash-preview")],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: ollamaProxy,
    },
    preview: {
      proxy: ollamaProxy,
    },
  };
});
