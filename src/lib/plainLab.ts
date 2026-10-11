import type { Passage } from "../data/documents";

function syllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!clean) return 0;
  if (clean.length <= 3) return 1;
  const trimmed = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, trimmed.match(/[aeiouy]{1,2}/g)?.length ?? 1);
}

export type Readability = { sentences: number; words: number; readingEase: number; grade: number };

/** Flesch Reading Ease and Flesch-Kincaid grade. A formula estimate; it does not replace testing with readers. */
export function readability(text: string): Readability {
  const sentences = Math.max(1, text.split(/[.!?]+(?=\s|$)/).filter((part) => part.trim()).length);
  const list = text.split(/\s+/).filter((word) => /[a-z0-9]/i.test(word));
  const words = Math.max(1, list.length);
  const syl = list.reduce((sum, word) => sum + syllables(word), 0);
  const readingEase = 206.835 - 1.015 * (words / sentences) - 84.6 * (syl / words);
  const grade = 0.39 * (words / sentences) + 11.8 * (syl / words) - 15.59;
  return { sentences, words: list.length, readingEase: Math.round(readingEase), grade: Math.round(grade * 10) / 10 };
}

const swaps: [RegExp, string][] = [
  [/\bYou come\b/g, "The person in the study comes"],
  [/\bYou will come\b/g, "The person in the study will come"],
  [/\bYou receive\b/g, "They receive"],
  [/\byou receive\b/g, "they receive"],
  [/\bYou do not pay\b/g, "They do not pay"],
  [/\bAfter each visit you complete\b/g, "After each visit they complete"],
  [/\byou complete\b/g, "they complete"],
  [/\bYou can\b/g, "They can"],
  [/\byou can\b/g, "they can"],
  [/\bYour\b/g, "Their"],
  [/\byour\b/g, "their"],
  [/\bYou\b/g, "They"],
  [/\byou\b/g, "them"],
];

/** Rewrites a second-person reading for a caregiver. The figures are untouched. */
export function toCaregiver(adult: string): string {
  return swaps.reduce((text, [pattern, next]) => text.replace(pattern, next), adult);
}

const promotional = ["breakthrough", "proven", "cure", "guarantee", "miracle", "life-changing", "revolutionary"];
const figurePattern = /\$\d+|\b\d+\s*(?:times|visits|weeks|years|teaspoons|hours|in \d+)\b/gi;

export type DraftCheck = { id: string; label: string; passed: boolean; note: string };

export type CheckSource = {
  /** Text of every consent clause the reading draws on. */
  original: string;
  /** Figures the reading must keep, such as "6 times". */
  mustKeep: string[];
  /** Figures that belong to the other document and must not appear. */
  mustNotAdd: string[];
  /** Named risks that must still be named. */
  risks?: string[];
  /** The clause says nobody is told the assignment. */
  blinded?: boolean;
};

export function checkDraft(text: string, source: CheckSource): DraftCheck[] {
  const lower = text.toLowerCase();
  const checks: DraftCheck[] = [];
  for (const token of source.mustKeep) {
    checks.push({
      id: `keep-${token}`,
      label: "Figure kept",
      passed: lower.includes(token.toLowerCase()),
      note: lower.includes(token.toLowerCase()) ? `Keeps “${token}”.` : `Drops or changes “${token}”.`,
    });
  }
  const sourceFigures = new Set((source.original.match(figurePattern) ?? []).map((figure) => figure.toLowerCase()));
  const added = (text.match(figurePattern) ?? []).filter((figure) => !sourceFigures.has(figure.toLowerCase()));
  checks.push({
    id: "no-new-figures",
    label: "No new figures",
    passed: added.length === 0,
    note: added.length === 0 ? "Every figure appears in the source." : `Not in the source: ${[...new Set(added)].join(", ")}.`,
  });
  const imported = source.mustNotAdd.filter((token) => lower.includes(token.toLowerCase()));
  checks.push({
    id: "no-protocol-figures",
    label: "No figures from the other document",
    passed: imported.length === 0,
    note: imported.length === 0 ? "No protocol figures." : `Copies ${imported.join(", ")} from the protocol.`,
  });
  const promo = promotional.filter((word) => lower.includes(word));
  checks.push({
    id: "neutral",
    label: "Neutral wording",
    passed: promo.length === 0,
    note: promo.length === 0 ? "No promotional words." : `Promotional: ${promo.join(", ")}.`,
  });
  if (source.risks) {
    const dropped = source.risks.filter((risk) => !lower.includes(risk.toLowerCase()));
    checks.push({
      id: "risks",
      label: "Named risks kept",
      passed: dropped.length === 0,
      note: dropped.length === 0 ? "Every named risk is still named." : `Leaves out: ${dropped.join(", ")}.`,
    });
  }
  if (source.blinded) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const told = sentences.find(
      (sentence) => /\b(doctor|you)\b.*\b(knows?|will know|is told|are told)\b/i.test(sentence) && !/\b(not|neither|n't|no one)\b/i.test(sentence),
    );
    checks.push({
      id: "blinding",
      label: "Who is told stays the same",
      passed: !told,
      note: told ? `Says someone is told the assignment: “${told.trim()}”` : "Nobody is said to be told the assignment.",
    });
  }
  return checks;
}

export type PlantedDraft = { id: string; label: string; text: string; source: CheckSource; expect: string | null };

const costsSource: CheckSource = {
  original:
    "You will come to the study clinic 6 times over about 16 weeks. The study drug, placebo, and study-required visits are provided at no cost to you. You will receive $50 for each completed clinic visit, paid after the visit.",
  mustKeep: ["6 times", "16 weeks", "$50"],
  mustNotAdd: ["8 visits", "24 weeks", "$80"],
};

const risksSource: CheckSource = {
  original:
    "Aetherol may cause nausea, dizziness, or fatigue. In earlier studies described in this form, about 1 in 10 people reported nausea. Rare allergic reactions are possible. This study may not help your migraines. There is no promise of benefit.",
  mustKeep: ["1 in 10"],
  mustNotAdd: [],
  risks: ["nausea", "dizziness", "allergic"],
};

const assignmentSource: CheckSource = {
  original: "You will be assigned by chance to Aetherol or placebo. Neither you nor the study doctor will know which one you receive during the study.",
  mustKeep: [],
  mustNotAdd: [],
  blinded: true,
};

export const plantedDrafts: PlantedDraft[] = [
  {
    id: "changed-number",
    label: "Changed number",
    text: "You come to the clinic 6 times over about 16 weeks. After each visit you complete, you receive $60.",
    source: costsSource,
    expect: "keep-$50",
  },
  {
    id: "protocol-number",
    label: "Number copied from the protocol",
    text: "You come to the clinic 8 visits over about 16 weeks, 6 times in total. After each visit you receive $50.",
    source: costsSource,
    expect: "no-protocol-figures",
  },
  {
    id: "promotional",
    label: "Promotional wording",
    text: "This breakthrough study asks you to come 6 times over about 16 weeks. You receive $50 after each visit.",
    source: costsSource,
    expect: "neutral",
  },
  {
    id: "omitted-risk",
    label: "Serious side effect left out",
    text: "Aetherol may cause nausea or dizziness. About 1 in 10 people had nausea. The study may not help.",
    source: risksSource,
    expect: "risks",
  },
  {
    id: "swapped",
    label: "Swapped who is told the assignment",
    text: "A chance process picks Aetherol or placebo. The study doctor knows which one you receive.",
    source: assignmentSource,
    expect: "blinding",
  },
  {
    id: "clean",
    label: "Control: faithful reading",
    text: "You come to the clinic 6 times over about 16 weeks. After each visit you complete, you receive $50.",
    source: costsSource,
    expect: null,
  },
];

export function runPlantedDrafts() {
  const results = plantedDrafts.map((draft) => {
    const failed = checkDraft(draft.text, draft.source).filter((check) => !check.passed);
    const caught = draft.expect ? failed.some((check) => check.id === draft.expect) : failed.length === 0;
    return { ...draft, failed, caught };
  });
  const planted = results.filter((item) => item.expect);
  return {
    results,
    caught: planted.filter((item) => item.caught).length,
    planted: planted.length,
    falseAlarms: results.filter((item) => !item.expect && !item.caught).length,
  };
}

/** Where each figure in a reading appears in the stored consent. */
export function traceFigures(text: string, passages: Passage[]) {
  const figures = [...new Set(text.match(figurePattern) ?? [])];
  return figures.map((figure) => {
    const hit = passages.find((passage) => passage.text.toLowerCase().includes(figure.toLowerCase()));
    return { figure, citation: hit ? `${hit.citation}, ${hit.page}` : null, quote: hit?.text.split(/(?<=[.!?])\s+/).find((sentence) => sentence.toLowerCase().includes(figure.toLowerCase())) ?? null };
  });
}
