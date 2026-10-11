import { passageBy } from "../data/documents";
import { plainDraft } from "../data/study";

export type Side = "protocol" | "consent";
export type BlockId = "visits" | "duration" | "pay" | "blood" | "retention";
export type BlockValues = Record<BlockId, Record<Side, string>>;

export type BlockUse = {
  id: string;
  place: string;
  owner: string;
  side: Side;
  template: string;
  /** Sentence in the stored document this template must reproduce, when the use lives in a source file. */
  source?: { documentId: string; version: string; sectionId: string };
};

export type Block = {
  id: BlockId;
  label: string;
  unit: string;
  owner: string;
  pattern: Record<Side, { documentId: string; version: string; sectionId: string; regex: RegExp }>;
};

const protocolRef = (sectionId: string) => ({ documentId: "PROT-AETHER-01", version: "v3.0", sectionId });
const consentRef = (sectionId: string) => ({ documentId: "ICF-AETHER-01", version: "v2.1", sectionId });

export const blocks: Block[] = [
  {
    id: "visits",
    label: "Clinic visits",
    unit: "visits",
    owner: "Study designer",
    pattern: {
      protocol: { ...protocolRef("visits"), regex: /(\d+) clinic visits/ },
      consent: { ...consentRef("procedures"), regex: /clinic (\d+) times/ },
    },
  },
  {
    id: "duration",
    label: "Time on study",
    unit: "weeks",
    owner: "Study designer",
    pattern: {
      protocol: { ...protocolRef("duration"), regex: /treatment period is (\d+) weeks/ },
      consent: { ...consentRef("procedures"), regex: /about (\d+) weeks/ },
    },
  },
  {
    id: "pay",
    label: "Visit payment",
    unit: "dollars per completed visit",
    owner: "Study designer",
    pattern: {
      protocol: { ...protocolRef("pay"), regex: /\$(\d+)/ },
      consent: { ...consentRef("costs"), regex: /\$(\d+)/ },
    },
  },
  {
    id: "blood",
    label: "Blood volume",
    unit: "teaspoons per sample",
    owner: "Laboratory lead",
    pattern: {
      protocol: { ...protocolRef("blood"), regex: /about (\d+) teaspoons/ },
      consent: { ...consentRef("procedures"), regex: /about (\d+) teaspoons/ },
    },
  },
  {
    id: "retention",
    label: "Record retention",
    unit: "years",
    owner: "Records manager",
    pattern: {
      protocol: { ...protocolRef("retention"), regex: /(\d+) years/ },
      consent: { ...consentRef("privacy"), regex: /(\d+) years/ },
    },
  },
];

export const uses: BlockUse[] = [
  {
    id: "protocol-visits",
    place: "Protocol §6.2 Schedule of assessments",
    owner: "Protocol author",
    side: "protocol",
    template: "Participants complete {visits} clinic visits during the {duration}-week treatment period.",
    source: protocolRef("visits"),
  },
  {
    id: "protocol-duration",
    place: "Protocol §6.1 Study design",
    owner: "Protocol author",
    side: "protocol",
    template: "The treatment period is {duration} weeks, with the last clinic visit at week {duration}.",
    source: protocolRef("duration"),
  },
  {
    id: "protocol-pay",
    place: "Protocol §11.4 Compensation",
    owner: "Protocol author",
    side: "protocol",
    template: "Participants are compensated ${pay} for each completed clinic visit.",
    source: protocolRef("pay"),
  },
  {
    id: "protocol-blood",
    place: "Protocol §6.4 Laboratory samples",
    owner: "Protocol author",
    side: "protocol",
    template: "Each scheduled blood sample is approximately 10 mL, about {blood} teaspoons.",
    source: protocolRef("blood"),
  },
  {
    id: "protocol-retention",
    place: "Protocol §12.2 Record retention",
    owner: "Protocol author",
    side: "protocol",
    template: "Essential documents are retained for {retention} years after study completion.",
    source: protocolRef("retention"),
  },
  {
    id: "consent-procedures",
    place: "Consent §4.1 Procedures",
    owner: "Consent author (IRB review)",
    side: "consent",
    template: "You will come to the study clinic {visits} times over about {duration} weeks.",
    source: consentRef("procedures"),
  },
  {
    id: "consent-blood",
    place: "Consent §4.1 Procedures",
    owner: "Consent author (IRB review)",
    side: "consent",
    template: "A blood sample of about {blood} teaspoons is taken at visits 1, 3, and 6.",
    source: consentRef("procedures"),
  },
  {
    id: "consent-pay",
    place: "Consent §7.1 Costs and payments",
    owner: "Consent author (IRB review)",
    side: "consent",
    template: "You will receive ${pay} for each completed clinic visit, paid after the visit.",
    source: consentRef("costs"),
  },
  {
    id: "consent-retention",
    place: "Consent §8.3 Confidentiality",
    owner: "Consent author (IRB review)",
    side: "consent",
    template: "Records may be kept for {retention} years.",
    source: consentRef("privacy"),
  },
  {
    id: "plain-adult",
    place: "Plain language, adult reader",
    owner: "Plain-language writer",
    side: "consent",
    template:
      "You come to the clinic {visits} times over about {duration} weeks. After each visit you complete, you receive ${pay}. You do not pay for the study drug or those required visits. The payment does not cover your usual migraine care.",
  },
];

export function extractValues(): BlockValues {
  const values = {} as BlockValues;
  for (const block of blocks) {
    const read = (side: Side) => {
      const { documentId, version, sectionId, regex } = block.pattern[side];
      const match = passageBy(documentId, version, sectionId).text.match(regex);
      if (!match) throw new Error(`${block.id}: no ${side} value found in ${documentId} ${version} ${sectionId}`);
      return match[1];
    };
    values[block.id] = { protocol: read("protocol"), consent: read("consent") };
  }
  return values;
}

export function render(template: string, side: Side, values: BlockValues): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? values[key as BlockId][side] : whole,
  );
}

export function blocksIn(template: string): BlockId[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1] as BlockId);
}

export function sourceText(use: BlockUse): string | null {
  if (!use.source) return null;
  return passageBy(use.source.documentId, use.source.version, use.source.sectionId).text;
}

export function registryFields(values: BlockValues) {
  return blocks.map((block) => {
    const { protocol, consent } = values[block.id];
    const show = (value: string) => (block.id === "pay" ? `$${value}` : `${value} ${block.unit}`);
    return {
      id: block.id,
      label: block.label,
      value: protocol === consent ? show(protocol) : `Protocol ${show(protocol)} · Consent ${show(consent)}`,
      agrees: protocol === consent,
    };
  });
}

export type ChangeLine = {
  id: string;
  place: string;
  owner: string;
  before: string;
  after: string;
  warnings: string[];
};

export function proposeChange(blockId: BlockId, next: string, values: BlockValues = extractValues()): ChangeLine[] {
  const updated: BlockValues = { ...values, [blockId]: { protocol: next, consent: next } };
  const namedVisits = (text: string) =>
    [...text.matchAll(/\bvisits?((?:\s|,|\d+|and)+)/g)].flatMap((match) => match[1].match(/\d+/g) ?? []).map(Number);
  const lines: ChangeLine[] = uses
    .filter(
      (use) =>
        blocksIn(use.template).includes(blockId) ||
        (blockId === "visits" && namedVisits(render(use.template, use.side, values)).length > 0),
    )
    .map((use) => {
      const after = render(use.template, use.side, updated);
      const warnings: string[] = [];
      if (blockId === "visits") {
        const beyond = namedVisits(after).filter((visit) => visit > Number(next));
        if (beyond.length > 0) {
          warnings.push(`Names visit ${beyond.join(", ")}, which would not exist with ${next} visits. A person has to rewrite this sentence.`);
        }
      }
      return { id: use.id, place: use.place, owner: use.owner, before: render(use.template, use.side, values), after, warnings };
    });
  const block = blocks.find((item) => item.id === blockId);
  const registryBefore = registryFields(values).find((field) => field.id === blockId);
  const registryAfter = registryFields(updated).find((field) => field.id === blockId);
  if (block && registryBefore && registryAfter) {
    lines.push({
      id: `registry-${blockId}`,
      place: `Registry card, ${block.label.toLowerCase()}`,
      owner: "Disclosure lead",
      before: `${block.label}: ${registryBefore.value}`,
      after: `${block.label}: ${registryAfter.value}`,
      warnings: [],
    });
  }
  return lines;
}

export function adultSeed(values: BlockValues = extractValues()): string {
  const use = uses.find((item) => item.id === "plain-adult");
  return use ? render(use.template, "consent", values) : plainDraft.draft;
}
