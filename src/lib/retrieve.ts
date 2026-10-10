import { listPassages, type Passage } from "../data/documents";
import { consentDoc } from "../data/study";

const stop = new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "and",
  "or",
  "in",
  "on",
  "for",
  "is",
  "are",
  "was",
  "be",
  "will",
  "you",
  "your",
  "this",
  "that",
  "with",
  "from",
  "it",
  "at",
  "by",
  "do",
  "does",
  "what",
  "how",
  "many",
  "about",
  "into",
  "not",
  "if",
  "can",
  "my",
  "me",
]);

export type RetrieveOptions = {
  kind?: "consent" | "protocol" | "any";
  usableOnly?: boolean;
  studyId?: string;
  documentId?: string | null;
  version?: string | null;
  limit?: number;
  within?: Passage[];
};

export type ScoredPassage = {
  passage: Passage;
  score: number;
};

export function retrievePassages(query: string, options: RetrieveOptions = {}): ScoredPassage[] {
  const kind = options.kind ?? "consent";
  const usableOnly = options.usableOnly ?? true;
  const studyId = options.studyId ?? "AETHER-01";
  const documentId =
    options.documentId === null
      ? undefined
      : (options.documentId ?? (kind === "consent" ? consentDoc.id : undefined));
  const version =
    options.version === null
      ? undefined
      : (options.version ?? (documentId === consentDoc.id ? consentDoc.version : undefined));
  const limit = options.limit ?? 4;
  const queryVector = termFrequency(tokens(query));
  if (queryVector.size === 0) return [];

  const source = options.within
    ? options.within
    : listPassages()
        .filter((passage) => passage.studyId === studyId)
        .filter((passage) => (kind === "any" ? true : passage.kind === kind))
        .filter((passage) => (usableOnly ? passage.usable : true))
        .filter((passage) => (documentId ? passage.documentId === documentId : true))
        .filter((passage) => (version ? passage.version === version : true));

  return source
    .map((passage) => ({
      passage,
      score: cosine(queryVector, termFrequency([...tokens(passage.text), ...tokens(passage.heading), ...tokens(passage.heading)])),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9$]+/g) ?? []).filter((token) => token.length > 2 && !stop.has(token));
}

function termFrequency(words: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  return counts;
}

function cosine(left: Map<string, number>, right: Map<string, number>): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (const [token, weight] of left) {
    leftNorm += weight * weight;
    const other = right.get(token);
    if (other) dot += weight * other;
  }
  for (const weight of right.values()) rightNorm += weight * weight;
  if (!dot || !leftNorm || !rightNorm) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}
