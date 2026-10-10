import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const ollamaProxy = {
  "/ollama": {
    target: "http://127.0.0.1:11434",
    rewrite: (path: string) => path.replace(/^\/ollama/, ""),
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: ollamaProxy,
  },
  preview: {
    proxy: ollamaProxy,
  },
});
