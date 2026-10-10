import { facts } from "../data/study";

export type CheckMark = "present" | "thin" | "missing";

export type ChecklistRow = {
  id: string;
  list: "M11" | "SPIRIT";
  item: string;
  mark: CheckMark;
  where: string;
  why: string;
};

export type BlockUse = {
  id: string;
  place: string;
  text: string;
  token: string;
};

export type ContentBlock = {
  id: string;
  label: string;
  owner: string;
  version: string;
  value: string;
  uses: BlockUse[];
};

export type AnnexRow = {
  id: string;
  element: string;
  state: string;
};

export type BriefSection = {
  id: string;
  heading: string;
  draft: string;
  precedent: string;
};

export const audienceDrafts = {
  adult:
    "You come to the clinic 6 times over about 16 weeks. After each visit you complete, you receive $50. You do not pay for the study drug or those required visits.",
  caregiver:
    "The person in the study comes to the clinic 6 times over about 16 weeks. After each completed visit, they receive $50. They do not pay for the study drug or those required visits.",
};

export const contentBlocks: ContentBlock[] = [
  {
    id: "visits",
    label: "Clinic visits",
    owner: "Study designer",
    version: "practice-1",
    value: "disagrees: protocol 8, consent 6",
    uses: [
      {
        id: "visits-protocol",
        place: "Protocol §6.2 Schedule of assessments",
        text: "Participants complete 8 clinic visits during the 24-week treatment period.",
        token: "8",
      },
      {
        id: "visits-consent",
        place: "Consent, procedures",
        text: "You will come to the study clinic 6 times over about 16 weeks.",
        token: "6",
      },
      {
        id: "visits-plain",
        place: "Plain language, adult reader",
        text: audienceDrafts.adult,
        token: "6",
      },
      {
        id: "visits-registry",
        place: "Registry card, visits field",
        text: "Visits: protocol says 8. Consent says 6.",
        token: "8",
      },
    ],
  },
  {
    id: "duration",
    label: "Time on study",
    owner: "Study designer",
    version: "practice-1",
    value: "disagrees: protocol 24 weeks, consent about 16 weeks",
    uses: [
      {
        id: "duration-protocol",
        place: "Protocol §6.1 Study design",
        text: "The treatment period is 24 weeks, with the last clinic visit at week 24.",
        token: "24 weeks",
      },
      {
        id: "duration-consent",
        place: "Consent, procedures",
        text: "You will come to the study clinic 6 times over about 16 weeks.",
        token: "16 weeks",
      },
    ],
  },
  {
    id: "pay",
    label: "Visit payment",
    owner: "Study designer",
    version: "practice-1",
    value: "disagrees: protocol $80, consent $50",
    uses: [
      {
        id: "pay-protocol",
        place: "Protocol §11.4 Compensation",
        text: "Participants are compensated $80 for each completed clinic visit.",
        token: "$80",
      },
      {
        id: "pay-consent",
        place: "Consent, costs",
        text: "You will receive $50 for each completed clinic visit, paid after the visit.",
        token: "$50",
      },
    ],
  },
];

export const checklist: ChecklistRow[] = [
  {
    id: "m11-design",
    list: "M11",
    item: "Study design",
    mark: "present",
    where: "Protocol §6.1, p. 11",
    why: "The practice protocol states a 24-week treatment period and a last visit at week 24.",
  },
  {
    id: "m11-soa",
    list: "M11",
    item: "Schedule of activities",
    mark: "thin",
    where: "Protocol §6.2, p. 14",
    why: "A visit count is stated. The practice file has no visit-by-visit procedure table.",
  },
  {
    id: "m11-labs",
    list: "M11",
    item: "Laboratory assessments",
    mark: "present",
    where: "Protocol §6.4, p. 16",
    why: "Blood volume is stated as about 2 teaspoons.",
  },
  {
    id: "m11-pay",
    list: "M11",
    item: "Compensation",
    mark: "present",
    where: "Protocol §11.4, p. 40",
    why: "A per-visit amount is stated.",
  },
  {
    id: "m11-records",
    list: "M11",
    item: "Record retention",
    mark: "present",
    where: "Protocol §12.2, p. 44",
    why: "Retention is stated as 15 years.",
  },
  {
    id: "m11-objectives",
    list: "M11",
    item: "Trial objectives",
    mark: "missing",
    where: "Not in the practice protocol file",
    why: "The practice protocol has no objectives section, so this row stays missing.",
  },
  {
    id: "m11-endpoints",
    list: "M11",
    item: "Endpoints",
    mark: "missing",
    where: "Not in the practice protocol file",
    why: "No endpoint is written, so no visit can be checked against one.",
  },
  {
    id: "m11-eligibility",
    list: "M11",
    item: "Eligibility criteria",
    mark: "missing",
    where: "Not in the practice protocol file",
    why: "No inclusion or exclusion rules are in the practice protocol.",
  },
  {
    id: "m11-stats",
    list: "M11",
    item: "Statistical methods",
    mark: "missing",
    where: "Not in the practice protocol file",
    why: "No analysis section is in the practice protocol.",
  },
  {
    id: "spirit-design",
    list: "SPIRIT",
    item: "Trial design",
    mark: "thin",
    where: "Protocol §6.1",
    why: "Duration is present. Allocation, masking, and the number of groups are not spelled out in this file.",
  },
  {
    id: "spirit-outcomes",
    list: "SPIRIT",
    item: "Outcomes",
    mark: "missing",
    where: "Not in the practice protocol file",
    why: "SPIRIT asks for outcomes. This practice file does not contain them.",
  },
  {
    id: "spirit-eligibility",
    list: "SPIRIT",
    item: "Eligibility criteria",
    mark: "missing",
    where: "Not in the practice protocol file",
    why: "SPIRIT asks for eligibility. This practice file does not contain it.",
  },
];

export const annexV: AnnexRow[] = [
  ["id", "Trial identification"],
  ["sponsor", "Sponsor contact"],
  ["general", "General information about the trial"],
  ["population", "Who took part"],
  ["product", "Investigational product"],
  ["safety", "Adverse reactions and how often they occurred"],
  ["results", "Overall results"],
  ["comments", "Comments on the outcome"],
  ["follow", "Whether follow-up trials are planned"],
  ["more", "Where to find more information"],
].map(([id, element]) => ({
  id,
  element,
  state: "No results. AETHER-01 is a practice consent and protocol, not a completed trial, so this heading stays empty.",
}));

export const briefSections: BriefSection[] = [
  {
    id: "brief-title",
    heading: "Title and purpose",
    draft:
      "Practice outline for AETHER-01, episodic migraine prevention, investigational product Aetherol, sponsor Northwind Clinical Research. This is not an approved protocol.",
    precedent: "Taken from the practice study label. No public trial was downloaded.",
  },
  {
    id: "brief-schedule",
    heading: "Schedule",
    draft:
      "The protocol text says 8 visits over 24 weeks. The consent text says 6 times over about 16 weeks. A person has to choose one before either sentence is reused.",
    precedent: "Both sentences are already in the practice pair. The outline does not pick a winner.",
  },
  {
    id: "brief-pay",
    heading: "Payment",
    draft: "The protocol text says $80 per completed visit. The consent text says $50. A person has to choose one.",
    precedent: "Both amounts are in the practice pair.",
  },
  {
    id: "brief-endpoints",
    heading: "Endpoints",
    draft: "Not written. The practice protocol has no endpoint, so this outline does not invent one.",
    precedent: "No similar public trial is loaded to use as precedent.",
  },
];

export const burden = {
  assumption: "Each clinic visit is counted as 2 hours, because the consent says a visit takes about 2 hours. This is an assumption, not a measured time.",
  protocolHours: 16,
  consentHours: 12,
  note: "8 visits × 2 hours = 16 hours in the protocol text. 6 visits × 2 hours = 12 hours in the consent text.",
};

export function versionStanding(version: string, approved: string[]): "unverified" | "listed" | "not-listed" {
  const list = approved.map((item) => item.trim()).filter(Boolean);
  if (list.length === 0) return "unverified";
  return list.some((item) => item.toLowerCase() === version.trim().toLowerCase()) ? "listed" : "not-listed";
}

export function versionNote(version: string, approved: string[]): string {
  const standing = versionStanding(version, approved);
  if (standing === "unverified") {
    return `${version} is Unverified. No one has entered an approved-version list.`;
  }
  if (standing === "listed") return `${version} is on the list a person entered in Settings.`;
  return `${version} is not on the list a person entered. It is not treated as the current approved form.`;
}

export function proposeVisitCount(next: string): Array<{ id: string; place: string; before: string; after: string }> {
  const block = contentBlocks.find((item) => item.id === "visits");
  if (!block) return [];
  return block.uses.map((use) => ({
    id: use.id,
    place: use.place,
    before: use.text,
    after: use.text.replace(use.token, next),
  }));
}

export function readingEase(text: string): { wordsPerSentence: number; label: string } {
  const sentences = text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean).length;
  const wordsPerSentence = sentences.length === 0 ? words : Math.round((words / sentences.length) * 10) / 10;
  const label =
    wordsPerSentence <= 15 ? "Shorter sentences" : wordsPerSentence <= 22 ? "Mixed sentence length" : "Long sentences";
  return { wordsPerSentence, label };
}

export function keepsConsentFigures(text: string): boolean {
  return ["6 times", "16 weeks", "$50"].every((token) => text.includes(token));
}

export function importsProtocolFigures(text: string): boolean {
  return ["8 visits", "24 weeks", "$80"].some((token) => text.toLowerCase().includes(token.toLowerCase()));
}

export function checklistCounts(rows: ChecklistRow[] = checklist): Record<CheckMark, number> {
  return rows.reduce<Record<CheckMark, number>>(
    (counts, row) => {
      counts[row.mark] += 1;
      return counts;
    },
    { present: 0, thin: 0, missing: 0 },
  );
}

export function pairedFacts() {
  return facts.map((fact) => ({
    id: fact.id,
    label: fact.label,
    same: fact.protocolValue === fact.consentValue,
    protocolValue: fact.protocolValue,
    consentValue: fact.consentValue,
  }));
}
