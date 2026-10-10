import consentV21 from "../../demo/synthetic/ICF-AETHER-01-v2.1.txt?raw";
import consentV20 from "../../demo/synthetic/ICF-AETHER-01-v2.0.txt?raw";
import protocolV30 from "../../demo/synthetic/PROT-AETHER-01-v3.0.txt?raw";

export type Passage = {
  id: string;
  studyId: string;
  documentId: string;
  version: string;
  date: string;
  kind: "consent" | "protocol";
  status: string;
  usable: boolean;
  sectionId: string;
  heading: string;
  page: string;
  citation: string;
  text: string;
  filename: string;
};

export type ParseResult = { ok: true; passages: Passage[] } | { ok: false; error: string };

const headerKeys = ["document-id", "version", "date", "study", "kind", "status", "usable"] as const;
const sectionKeys = ["section", "heading", "page", "citation"] as const;

let extra: Passage[] = [];

export function parseDocument(raw: string, filename = "upload", options?: { anyStudy?: boolean }): ParseResult {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!text) {
    return { ok: false, error: "This file has no readable text, so nothing was indexed." };
  }

  const parts = text.split(/\n---\n/);
  if (parts.length < 2) {
    return {
      ok: false,
      error: "This file has no section markers, so it was not indexed. Use the synthetic document header and a --- line before each section.",
    };
  }

  const header = readFields(parts[0], headerKeys);
  for (const key of headerKeys) {
    if (!header[key]) {
      return { ok: false, error: `Missing “${key}” in the document header, so the file was not indexed.` };
    }
  }
  if (!options?.anyStudy && header.study !== "AETHER-01") {
    return {
      ok: false,
      error: `This file belongs to ${header.study}, not AETHER-01, so it was not added to this study.`,
    };
  }
  if (header.kind !== "consent" && header.kind !== "protocol") {
    return { ok: false, error: "The document kind must be consent or protocol. The file was not indexed." };
  }

  const usable = header.usable.toLowerCase() === "yes";
  const passages: Passage[] = [];
  for (const block of parts.slice(1)) {
    const lines = block.trim().split("\n");
    const meta: Record<string, string> = {};
    let index = 0;
    for (; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line) {
        index += 1;
        break;
      }
      const splitAt = line.indexOf(":");
      if (splitAt === -1) break;
      const key = line.slice(0, splitAt).trim().toLowerCase();
      if (!sectionKeys.includes(key as (typeof sectionKeys)[number])) break;
      meta[key] = line.slice(splitAt + 1).trim();
    }
    const body = lines.slice(index).join("\n").trim();
    if (!meta.section || !meta.heading || !meta.page || !meta.citation || !body) {
      return { ok: false, error: "A section is missing its id, heading, page, citation, or text, so the file was not indexed." };
    }
    passages.push({
      id: `${header["document-id"]}:${header.version}:${meta.section}`,
      studyId: header.study,
      documentId: header["document-id"],
      version: header.version,
      date: header.date,
      kind: header.kind,
      status: header.status,
      usable,
      sectionId: meta.section,
      heading: meta.heading,
      page: meta.page,
      citation: meta.citation,
      text: body,
      filename,
    });
  }

  if (passages.length === 0) {
    return { ok: false, error: "No readable sections were found, so nothing was indexed." };
  }
  return { ok: true, passages };
}

function readFields(block: string, allowed: readonly string[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const splitAt = trimmed.indexOf(":");
    if (splitAt === -1) continue;
    const key = trimmed.slice(0, splitAt).trim().toLowerCase();
    if (!allowed.includes(key)) continue;
    fields[key] = trimmed.slice(splitAt + 1).trim();
  }
  return fields;
}

function loadSeed(raw: string, filename: string): Passage[] {
  const parsed = parseDocument(raw, filename);
  if (!parsed.ok) {
    throw new Error(`${filename}: ${parsed.error}`);
  }
  return parsed.passages;
}

const seed = [
  ...loadSeed(consentV21, "ICF-AETHER-01-v2.1.txt"),
  ...loadSeed(consentV20, "ICF-AETHER-01-v2.0.txt"),
  ...loadSeed(protocolV30, "PROT-AETHER-01-v3.0.txt"),
];

export function setExtraPassages(passages: Passage[]) {
  extra = passages;
}

export function listPassages(): Passage[] {
  return [...seed, ...extra];
}

export function passageBy(documentId: string, version: string, sectionId: string): Passage {
  const found = listPassages().find(
    (passage) =>
      passage.documentId === documentId && passage.version === version && passage.sectionId === sectionId,
  );
  if (!found) {
    throw new Error(`Missing passage ${documentId} ${version} ${sectionId}`);
  }
  return found;
}
