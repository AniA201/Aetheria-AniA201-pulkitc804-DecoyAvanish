import { plainDraft } from "../data/study";

const promotional = ["breakthrough", "proven", "cure", "guarantee", "miracle"];

export function auditPlainText(text: string): { passed: boolean; notes: string[] } {
  const notes = [
    ...plainDraft.mustKeep.map((token) =>
      text.includes(token) ? `Keeps “${token}” from the consent form.` : `Missing “${token}” from the consent form.`,
    ),
    ...plainDraft.mustNotAdd.map((token) =>
      text.toLowerCase().includes(token.toLowerCase())
        ? `Adds “${token}”, which is not the consent wording.`
        : `Does not import “${token}” from the other document.`,
    ),
  ];
  const hits = promotional.filter((word) => text.toLowerCase().includes(word));
  if (hits.length === 0) {
    notes.push("No promotional wording (breakthrough, proven, cure, guarantee, miracle).");
  } else {
    hits.forEach((word) => notes.push(`Promotional wording “${word}” is not allowed.`));
  }
  const passed =
    plainDraft.mustKeep.every((token) => text.includes(token)) &&
    plainDraft.mustNotAdd.every((token) => !text.toLowerCase().includes(token.toLowerCase())) &&
    hits.length === 0;
  return { passed, notes };
}

export function auditNumbers(original: string, draft: string): { passed: boolean; notes: string[] } {
  const figures = [...new Set(original.match(/\$\d+|\b\d+\s*(?:times|visits|weeks|years|teaspoons|hours)\b/gi) ?? [])];
  const notes =
    figures.length === 0
      ? ["No figures were detected in the source clause."]
      : figures.map((figure) =>
          draft.toLowerCase().includes(figure.toLowerCase())
            ? `Keeps “${figure}” from the submitted clause.`
            : `Missing “${figure}” from the submitted clause.`,
        );
  const passed = figures.every((figure) => draft.toLowerCase().includes(figure.toLowerCase()));
  return { passed, notes };
}

export function longSentenceCount(text: string): number {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split(/\s+/).filter(Boolean).length)
    .filter((count) => count > 25).length;
}
