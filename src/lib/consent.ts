import { parseDocument, type Passage } from "../data/documents";
import type { PdfPage } from "./pdf";
import { consentDoc, sections, study, teachPrompts, type TeachPrompt } from "../data/study";

export type ConsentSection = {
  id: string;
  index: string;
  title: string;
  short: string;
  original: string;
  plain: string;
  citation: string;
  page: string;
  terms: { word: string; meaning: string }[];
  ask: string;
};

export type SubmittedConsent = {
  source: "upload" | "demo";
  filename: string;
  documentId: string;
  version: string;
  date: string;
  status: "Unverified";
  statusNote: string;
  studyId: string;
  studyName: string;
  product: string;
  phase: string;
  sponsor: string;
  purpose: string;
  sample: boolean;
  hasProtocol: boolean;
  sections: ConsentSection[];
  passages: Passage[];
};

const statusNote = "No approval list was supplied, so this version stays unverified.";

export function loadDemoConsent(): SubmittedConsent {
  const passages: Passage[] = sections.map((section) => ({
    id: `${consentDoc.id}:${consentDoc.version}:${section.id}`,
    studyId: study.id,
    documentId: consentDoc.id,
    version: consentDoc.version,
    date: consentDoc.date,
    kind: "consent",
    status: consentDoc.status,
    usable: true,
    sectionId: section.id,
    heading: section.title,
    page: section.page,
    citation: section.citation,
    text: section.original,
    filename: consentDoc.filename,
  }));
  return {
    source: "demo",
    filename: consentDoc.filename,
    documentId: consentDoc.id,
    version: consentDoc.version,
    date: consentDoc.date,
    status: "Unverified",
    statusNote,
    studyId: study.id,
    studyName: study.name,
    product: study.product,
    phase: study.phase,
    sponsor: study.sponsor,
    purpose:
      "You are reading the included sample consent. It is not medical advice, and submitting it is not a signature.",
    sample: true,
    hasProtocol: true,
    sections: sections.map((section) => ({ ...section, terms: [...section.terms] })),
    passages,
  };
}

export function readConsentText(filename: string, text: string): { ok: true; consent: SubmittedConsent } | { ok: false; error: string } {
  const body = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!body) return { ok: false, error: "This file has no readable text, so nothing was submitted." };
  if (body.length > 400_000) return { ok: false, error: "This file is too long to read here, so it was not submitted." };

  if (/^document-id:/m.test(body) && body.includes("\n---\n")) {
    const parsed = parseDocument(body, filename, { anyStudy: true });
    if (!parsed.ok) return parsed;
    const consentPassages = parsed.passages.filter((passage) => passage.kind === "consent" && passage.usable);
    if (consentPassages.length === 0) {
      return { ok: false, error: "No usable consent sections were found, so the file was not submitted." };
    }
    return { ok: true, consent: fromPassages(filename, consentPassages, false) };
  }

  const sectionsFromText = splitFreeform(body);
  if (sectionsFromText.length === 0) {
    return { ok: false, error: "This file has no readable text, so nothing was submitted." };
  }
  const stamp = new Date().toISOString().slice(0, 10);
  const documentId = filename.replace(/\.[^.]+$/, "") || "consent";
  const passages: Passage[] = sectionsFromText.map((section) => ({
    id: `${documentId}:uploaded:${section.id}`,
    studyId: documentId,
    documentId,
    version: "uploaded",
    date: stamp,
    kind: "consent",
    status: "Unverified",
    usable: true,
    sectionId: section.id,
    heading: section.title,
    page: section.page,
    citation: section.citation,
    text: section.original,
    filename,
  }));
  return {
    ok: true,
    consent: {
      source: "upload",
      filename,
      documentId,
      version: "uploaded",
      date: stamp,
      status: "Unverified",
      statusNote,
      studyId: documentId,
      studyName: documentId,
      product: "Not named in the file",
      phase: "Not named in the file",
      sponsor: "Not named in the file",
      purpose: "This reading uses only the consent file you submitted.",
      sample: false,
      hasProtocol: false,
      sections: sectionsFromText,
      passages,
    },
  };
}

export function readConsentPages(
  filename: string,
  pages: PdfPage[],
): { ok: true; consent: SubmittedConsent } | { ok: false; error: string } {
  const kept = pages.filter((page) => page.text.trim());
  if (kept.length === 0) {
    return { ok: false, error: "This PDF has no readable text, so nothing was submitted." };
  }
  const documentId = filename.replace(/\.[^.]+$/, "") || "consent";
  const stamp = new Date().toISOString().slice(0, 10);
  const sectionsFromPages = sectionsFromPdf(kept);
  const named = (heading: string) =>
    sectionsFromPages.find((section) => section.title.toLowerCase() === heading.toLowerCase())?.original;
  const passages: Passage[] = sectionsFromPages.map((section) => ({
    id: `${documentId}:uploaded:${section.id}`,
    studyId: documentId,
    documentId,
    version: "uploaded",
    date: stamp,
    kind: "consent",
    status: "Unverified",
    usable: true,
    sectionId: section.id,
    heading: section.title,
    page: section.page,
    citation: section.citation,
    text: section.original,
    filename,
  }));
  return {
    ok: true,
    consent: {
      source: "upload",
      filename,
      documentId,
      version: "uploaded",
      date: stamp,
      status: "Unverified",
      statusNote,
      studyId: documentId,
      studyName: named("Title") || documentId,
      product: named("Principal investigator") || "See the form",
      phase: "See the form",
      sponsor: named("Study sponsor") || "See the form",
      purpose: "This reading uses only the file you submitted.",
      sample: false,
      hasProtocol: false,
      sections: sectionsFromPages,
      passages,
    },
  };
}

function sectionsFromPdf(pages: PdfPage[]): ConsentSection[] {
  const chunks: { title: string; page: number; total: number; lines: string[] }[] = [];
  let current: (typeof chunks)[number] | null = null;
  for (const page of pages) {
    for (const raw of page.text.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      if (isHeading(line)) {
        current = { title: titleCase(line), page: page.number, total: page.total, lines: [] };
        chunks.push(current);
      } else if (!current) {
        current = { title: "Start of the form", page: page.number, total: page.total, lines: [line] };
        chunks.push(current);
      } else {
        current.lines.push(line);
      }
    }
  }
  return chunks
    .filter((chunk) => chunk.lines.length > 0)
    .map((chunk, index) => {
      const original = toParagraphs(chunk.lines);
      return {
        id: slug(chunk.title, index),
        index: String(index + 1).padStart(2, "0"),
        title: chunk.title,
        short: original.split(/(?<=[.!?])\s+/)[0]?.slice(0, 90) || chunk.title,
        original,
        plain: plainReading(original),
        citation: `Page ${chunk.page} of ${chunk.total}`,
        page: `p. ${chunk.page}`,
        terms: [],
        ask: `What does the form say about ${chunk.title.toLowerCase()}?`,
      };
    });
}

function isHeading(line: string): boolean {
  const text = line.replace(/:$/, "").trim();
  if (text.length < 4 || text.length > 60) return false;
  if (text.split(/\s+/).length > 8) return false;
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4) return false;
  return letters.replace(/[^A-Z]/g, "").length / letters.length > 0.8;
}

function continuesWord(current: string, next: string): boolean {
  const last = current.split(/\s+/).at(-1)?.toLowerCase() ?? "";
  if (last.length < 2 || last.length > 3 || /^[A-Z]/.test(next) || commonWord.has(last)) return false;
  return /^[a-z]/.test(next);
}

const commonWord = new Set([
  "a", "an", "the", "of", "to", "in", "on", "or", "and", "for", "be", "is", "it", "we", "you", "are", "if",
  "as", "at", "by", "do", "no", "not", "but", "can", "may", "has", "had", "was", "any", "all", "our", "who",
  "how", "why", "its", "his", "her", "end", "use", "per", "day", "one", "two",
]);

function titleCase(line: string): string {
  const text = line.replace(/:$/, "").trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toParagraphs(lines: string[]): string {
  const paragraphs: string[] = [];
  let current = "";
  for (const line of lines) {
    if (!current) {
      current = line;
      continue;
    }
    if (/[.!?]$/.test(current) && /^[A-Z«]/.test(line)) {
      paragraphs.push(current);
      current = line;
    } else if (continuesWord(current, line)) {
      current = `${current}${line}`;
    } else {
      current = `${current} ${line}`;
    }
  }
  if (current) paragraphs.push(current);
  return paragraphs.join("\n\n");
}

export function promptsFor(consent: SubmittedConsent): TeachPrompt[] {
  if (consent.source === "demo") return teachPrompts;
  return consent.sections.map((section) => {
    const sentence = section.original.split(/(?<=[.!?])\s+/)[0] ?? section.original;
    const phrase = sentence.toLowerCase().slice(0, 48);
    return {
      id: section.id,
      sectionId: section.id,
      topic: section.title,
      question: `In your own words, what does “${section.title}” tell you?`,
      concepts: [
        {
          id: `${section.id}-point`,
          label: sentence,
          phrases: [phrase.slice(0, 24).trim()].filter((item) => item.length > 3),
        },
      ],
      reexplain: section.plain,
    };
  });
}

export function plainReading(original: string): string {
  const flat = original.replace(/;\s+/g, ". ").replace(/\s+/g, " ").trim();
  const sentences = flat.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2) return flat;
  return sentences.slice(0, 2).join(" ");
}

function fromPassages(filename: string, passages: Passage[], sample: boolean): SubmittedConsent {
  const first = passages[0];
  const built = passages.map((passage, index) => toSection(passage, index));
  return {
    source: "upload",
    filename,
    documentId: first.documentId,
    version: first.version,
    date: first.date,
    status: "Unverified",
    statusNote,
    studyId: first.studyId,
    studyName: first.studyId,
    product: "Not named in the file",
    phase: "Not named in the file",
    sponsor: "Not named in the file",
    purpose: "This reading uses only the consent file you submitted.",
    sample,
    hasProtocol: false,
    sections: built,
    passages,
  };
}

function toSection(passage: Passage, index: number): ConsentSection {
  const title = passage.heading || `Section ${index + 1}`;
  return {
    id: slug(passage.sectionId || title, index),
    index: String(index + 1).padStart(2, "0"),
    title,
    short: passage.text.split(/(?<=[.!?])\s+/)[0]?.slice(0, 90) || title,
    original: passage.text,
    plain: plainReading(passage.text),
    citation: passage.citation,
    page: passage.page,
    terms: [],
    ask: `What does the form say about ${title.toLowerCase()}?`,
  };
}

function splitFreeform(text: string): ConsentSection[] {
  const headed = text.split(/\n(?=#{1,3} )/).map((block) => block.trim()).filter(Boolean);
  const blocks = headed.length > 1 || /^#{1,3} /m.test(text) ? headed : chunkParagraphs(text);
  return blocks.slice(0, 12).map((block, index) => {
    const lines = block.split("\n");
    const heading = lines[0].replace(/^#{1,3}\s+/, "").trim();
    const body = (/^#{1,3}\s+/.test(lines[0]) ? lines.slice(1).join("\n") : block).trim();
    const original = body || heading;
    const title = body ? heading : `Section ${index + 1}`;
    return {
      id: slug(title, index),
      index: String(index + 1).padStart(2, "0"),
      title,
      short: original.split(/(?<=[.!?])\s+/)[0]?.slice(0, 90) || title,
      original,
      plain: plainReading(original),
      citation: title,
      page: "",
      terms: [],
      ask: `What does the form say about ${title.toLowerCase()}?`,
    };
  });
}

function chunkParagraphs(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return [text.trim()];
  const chunks: string[] = [];
  for (let i = 0; i < paragraphs.length; i += 2) chunks.push(paragraphs.slice(i, i + 2).join("\n\n"));
  return chunks;
}

function slug(value: string, index: number): string {
  const base = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `${base || "section"}-${index + 1}`;
}
