import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

export type PdfPage = {
  number: number;
  total: number;
  text: string;
};

export type PdfExtract =
  | { ok: true; pages: PdfPage[]; characters: number }
  | { ok: false; error: string };

let workerReady = false;

function configureWorker() {
  if (workerReady) return;
  GlobalWorkerOptions.workerSrc =
    typeof window === "undefined"
      ? new URL("../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).href
      : workerSrc;
  workerReady = true;
}

type TextItem = {
  str: string;
  transform: number[];
  width?: number;
};

export async function extractPdfText(data: Uint8Array): Promise<PdfExtract> {
  configureWorker();
  try {
    const doc = await getDocument({
      data,
      useSystemFonts: true,
      ...(typeof window === "undefined"
        ? {
            standardFontDataUrl: new URL("../../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).href,
          }
        : {}),
    }).promise;
    const raw: string[] = [];
    for (let number = 1; number <= doc.numPages; number += 1) {
      const page = await doc.getPage(number);
      const content = await page.getTextContent();
      raw.push(linesFromItems(content.items as TextItem[]));
    }
    const cleaned = stripSharedLines(raw);
    const pages = cleaned
      .map((text, index) => ({ number: index + 1, total: doc.numPages, text: text.trim() }))
      .filter((page) => page.text.length > 0);
    const characters = pages.reduce((sum, page) => sum + page.text.length, 0);
    if (pages.length === 0 || characters < 12) {
      return {
        ok: false,
        error:
          "This PDF has no readable text. It may be a scan, and this app does not run OCR, so nothing was submitted.",
      };
    }
    return { ok: true, pages, characters };
  } catch {
    return {
      ok: false,
      error: "This PDF could not be read, so nothing was submitted.",
    };
  }
}

function linesFromItems(items: TextItem[]): string {
  const glyphs = items.filter((item) => item.str && item.transform?.length >= 6);
  glyphs.sort((left, right) => {
    const y = right.transform[5] - left.transform[5];
    if (Math.abs(y) > 2) return y;
    return left.transform[4] - right.transform[4];
  });
  const lines: string[] = [];
  let currentY: number | null = null;
  let lastX = 0;
  let lastWidth = 0;
  let line = "";
  for (const item of glyphs) {
    const y = item.transform[5];
    const x = item.transform[4];
    const width = item.width ?? 0;
    const originGap = x - lastX;
    const inkGap = x - (lastX + lastWidth);
    if (currentY === null || Math.abs(y - currentY) > 3 || originGap > 70) {
      if (line.trim()) lines.push(line.trim());
      line = item.str;
      currentY = y;
    } else {
      const sameWord = inkGap < 0.9 && !line.endsWith(" ") && !item.str.startsWith(" ");
      line += sameWord || line.endsWith("-") ? item.str : item.str.startsWith(" ") || line.endsWith(" ") ? item.str : ` ${item.str}`;
    }
    lastX = x;
    lastWidth = width;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.filter((entry) => !isRunningHeader(entry) && !isDebris(entry)).join("\n");
}

function isDebris(line: string): boolean {
  if (/^«[^»]*»$/.test(line)) return true;
  if (line.length <= 2) return true;
  const words = line.split(/\s+/);
  const tiny = words.filter((word) => word.replace(/[^A-Za-z]/g, "").length <= 2).length;
  return words.length >= 3 && tiny / words.length > 0.55;
}

function isRunningHeader(line: string): boolean {
  return /study no\.|irb use only|document approved|project approval expires|version date|main icf|irb form|page \d+ of \d+/i.test(
    line,
  );
}

function stripSharedLines(pages: string[]): string[] {
  if (pages.length < 2) return pages;
  const counts = new Map<string, number>();
  const normalized = pages.map((page) =>
    page
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  for (const lines of normalized) {
    for (const line of new Set(lines.map(normalizeLine))) {
      if (line.length < 18) continue;
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }
  const repeated = new Set(
    [...counts.entries()]
      .filter(([, count]) => count >= Math.ceil(pages.length * 0.6))
      .map(([line]) => line),
  );
  return normalized.map((lines) => lines.filter((line) => !repeated.has(normalizeLine(line))).join("\n"));
}

function normalizeLine(line: string): string {
  return line
    .toLowerCase()
    .replace(/page\s+\d+\s+of\s+\d+/g, "page")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}
