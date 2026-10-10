import { parseDocument, type ParseResult } from "../data/documents";

const maxBytes = 1_500_000;

export function rejectUpload(file: { name: string; type: string; size: number }): string | null {
  if (file.size <= 0) return "This file is empty, so nothing was indexed.";
  if (file.size > maxBytes) return "This file is over 1.5 MB, so it was not indexed.";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || file.type === "application/pdf") {
    return "This PDF was not indexed. Text extraction is not available, so an empty file was not treated as complete. Use a .txt or .md file, or the included sample.";
  }
  if (ext === "docx" || file.type.includes("wordprocessingml")) {
    return "This DOCX was not indexed. Word extraction is not included. Use a .txt or .md file, or the included sample.";
  }
  if (ext !== "txt" && ext !== "md" && ext !== "text") {
    return "This file type was not indexed. Use a .txt or .md document with the AETHER-01 header.";
  }
  return null;
}

export function inspectText(filename: string, text: string): ParseResult {
  return parseDocument(text, filename);
}
