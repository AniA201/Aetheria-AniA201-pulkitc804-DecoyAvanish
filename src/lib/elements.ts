import type { Passage } from "../data/documents";

export type ElementResult = {
  id: string;
  ref: string;
  element: string;
  mark: "present" | "thin" | "missing";
  where: string;
  note: string;
};

type Part = { label: string; pattern: RegExp };
type Element = { id: string; ref: string; element: string; parts: Part[] };

/** Basic elements of informed consent, 21 CFR 50.25(a)(1)–(8), and the ClinicalTrials.gov statement in 50.25(c). */
const elements: Element[] = [
  {
    id: "a1",
    ref: "50.25(a)(1)",
    element: "Research purpose, how long, and what happens",
    parts: [
      { label: "purpose", pattern: /purpose|looks at whether|this study (is|tests|studies)|why (we|this study)/i },
      { label: "duration", pattern: /\b\d+\s*(weeks?|months?|years?)\b|how long/i },
      { label: "procedures", pattern: /visit|procedure|blood sample|diary|vital signs/i },
    ],
  },
  { id: "a2", ref: "50.25(a)(2)", element: "Foreseeable risks or discomforts", parts: [{ label: "risks", pattern: /risk|side effect|may cause|discomfort/i }] },
  { id: "a3", ref: "50.25(a)(3)", element: "Benefits that may reasonably be expected", parts: [{ label: "benefits", pattern: /benefit|may not help|may help/i }] },
  { id: "a4", ref: "50.25(a)(4)", element: "Alternative procedures or treatments", parts: [{ label: "alternatives", pattern: /alternative|other (treatments?|options|choices)|instead of (joining|taking part)/i }] },
  {
    id: "a5",
    ref: "50.25(a)(5)",
    element: "Confidentiality, including that FDA may inspect records",
    parts: [
      { label: "confidentiality", pattern: /confidential|code instead of your name|coded records|privacy/i },
      { label: "FDA inspection", pattern: /\bFDA\b|Food and Drug Administration/i },
    ],
  },
  { id: "a6", ref: "50.25(a)(6)", element: "Compensation and treatment if injured", parts: [{ label: "injury", pattern: /injur|if you are hurt|harmed by/i }] },
  { id: "a7", ref: "50.25(a)(7)", element: "Whom to contact with questions or after an injury", parts: [{ label: "contact", pattern: /contact|call\b|phone|questions about (the study|your rights)/i }] },
  { id: "a8", ref: "50.25(a)(8)", element: "Participation is voluntary and you may stop at any time", parts: [{ label: "voluntary", pattern: /voluntary|leave the study at any time|without penalty|any time/i }] },
  { id: "c", ref: "50.25(c)", element: "ClinicalTrials.gov statement", parts: [{ label: "ClinicalTrials.gov", pattern: /ClinicalTrials\.gov/i }] },
];

export function consentElements(passages: Passage[]): ElementResult[] {
  return elements.map((element) => {
    const found = element.parts.map((part) => ({
      part,
      passage: passages.find((passage) => part.pattern.test(passage.text)),
    }));
    const hits = found.filter((item) => item.passage);
    const missingParts = found.filter((item) => !item.passage).map((item) => item.part.label);
    const where = [...new Set(hits.map((item) => `${item.passage!.citation}, ${item.passage!.page}`))].join(" · ") || "Not found";
    const mark = hits.length === 0 ? "missing" : missingParts.length === 0 ? "present" : "thin";
    let note =
      mark === "present"
        ? `Found in ${where}.`
        : mark === "thin"
          ? `Found ${hits.map((item) => item.part.label).join(", ")}. Not found: ${missingParts.join(", ")}.`
          : "Not found in this form.";
    if (element.id === "c" && mark === "missing" && passages.some((passage) => /public (study )?listing/i.test(passage.text))) {
      note = "The form mentions a public listing but not the ClinicalTrials.gov statement that 50.25(c) asks for.";
    }
    return { id: element.id, ref: element.ref, element: element.element, mark, where, note };
  });
}
