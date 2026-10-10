import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readConsentPages } from "./consent";
import { extractPdfText } from "./pdf";

const fixture = join(dirname(fileURLToPath(import.meta.url)), "../../demo/fixtures/one-page-consent.pdf");

describe("PDF consent extraction", () => {
  it("reads a one-page PDF and keeps the sentence", async () => {
    const extracted = await extractPdfText(new Uint8Array(readFileSync(fixture)));
    if (!extracted.ok) throw new Error(extracted.error);
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;
    expect(extracted.pages).toHaveLength(1);
    expect(extracted.pages[0].text).toContain("4 times");
    const consent = readConsentPages("tiny.pdf", extracted.pages);
    expect(consent.ok).toBe(true);
    if (!consent.ok) return;
    expect(consent.consent.sections[0].original).toContain("4 times");
    expect(consent.consent.sections[0].citation).toBe("Page 1 of 1");
    expect(consent.consent.hasProtocol).toBe(false);
  });

  it("refuses a PDF with no text layer", async () => {
    const extracted = await extractPdfText(new TextEncoder().encode("%PDF-1.4\n%%EOF"));
    expect(extracted.ok).toBe(false);
  });

  it("reads the downloaded sample consent and keeps every page", async () => {
    const file = "/Users/anishallada/Downloads/sample_IC.pdf";
    const extracted = await extractPdfText(new Uint8Array(readFileSync(file)));
    if (!extracted.ok) throw new Error(extracted.error);
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;
    expect(extracted.pages.length).toBe(16);
    expect(extracted.characters).toBeGreaterThan(20000);
    const joined = extracted.pages.map((page) => page.text).join("\n");
    expect(joined).toContain("Omacetaxine");
    expect(joined).toContain("Consent to be a Research Subject");
    const consent = readConsentPages("sample_IC.pdf", extracted.pages);
    expect(consent.ok).toBe(true);
    if (!consent.ok) return;
    expect(consent.consent.sections.length).toBeGreaterThan(5);
    expect(consent.consent.sections.map((section) => section.title).join(" ")).toMatch(/Introduction/i);
    const stored = consent.consent.sections.map((section) => section.original).join("\n");
    expect(stored.length).toBeGreaterThan(15000);
    expect(consent.consent.sections.some((section) => section.citation === "Page 16 of 16")).toBe(true);
    expect(stored).toContain("print your name and sign below");
    expect(consent.consent.studyName.toLowerCase()).toContain("omacetaxine");
    expect(consent.consent.sections.every((section) => section.plain.length < section.original.length + 1)).toBe(
      true,
    );
  });
});
