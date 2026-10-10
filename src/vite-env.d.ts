/// <reference types="vite/client" />

declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export * from "pdfjs-dist";
}

declare module "pdfjs-dist/legacy/build/pdf.worker.mjs?url" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_OLLAMA_MODEL?: string;
  readonly VITE_OLLAMA_BASE?: string;
}
