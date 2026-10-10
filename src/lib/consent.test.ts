import { describe, expect, it } from "vitest";
import { answerQuestion } from "./answers";
import { loadDemoConsent, readConsentText } from "./consent";
import { retrievePassages } from "./retrieve";

describe("submitted consent", () => {
  it("loads the included sample with a paired protocol and the consent’s own visit count", () => {
    const sample = loadDemoConsent();
    expect(sample.sample).toBe(true);
    expect(sample.hasProtocol).toBe(true);
    expect(sample.version).toBe("v2.1");
    expect(sample.sections[0].original).toContain("6 times");
    expect(sample.passages.every((passage) => passage.version === "v2.1")).toBe(true);
  });

  it("reads a plain consent without inventing a protocol or the sample’s numbers", () => {
    const parsed = readConsentText("clinic.md", "# Privacy\n\nStudy records are kept for 3 years.\n");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.consent.hasProtocol).toBe(false);
    expect(parsed.consent.sample).toBe(false);
    expect(parsed.consent.sections[0].original).toContain("3 years");
    expect(parsed.consent.sections[0].plain).toContain("3 years");
    const visits = answerQuestion("How many clinic visits are in this study?", {
      demoRules: false,
      documentId: parsed.consent.documentId,
      version: parsed.consent.version,
    });
    expect(visits.supported).toBe(false);
    expect(visits.answer).not.toContain("6 times");
    const found = retrievePassages("How long are records kept?", { within: parsed.consent.passages });
    expect(found[0]?.passage.text).toContain("3 years");
  });
});
