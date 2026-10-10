export type SectionId =
  | "procedures"
  | "risks"
  | "rights"
  | "costs"
  | "privacy";

export type Term = {
  word: string;
  meaning: string;
};

export type Section = {
  id: SectionId;
  index: string;
  title: string;
  short: string;
  original: string;
  plain: string;
  citation: string;
  page: string;
  terms: Term[];
  ask: string;
};

export type Fact = {
  id: string;
  label: string;
  protocolValue: string;
  consentValue: string;
  protocolQuote: string;
  consentQuote: string;
  protocolSource: string;
  consentSource: string;
  why: string;
};

export type TeachConcept = {
  id: string;
  label: string;
  phrases: string[];
};

export type TeachPrompt = {
  id: string;
  sectionId: SectionId;
  topic: string;
  question: string;
  concepts: TeachConcept[];
  reexplain: string;
};

export const study = {
  id: "AETHER-01",
  name: "Episodic migraine prevention",
  product: "Aetherol",
  phase: "Phase 2",
  sponsor: "Northwind Clinical Research",
  label: "Synthetic demo",
  purpose:
    "This fictional study looks at whether an investigational product called Aetherol changes the number of migraine days over the study period. Nothing in this demo is a real trial, a real medicine, or medical advice.",
};

export const consentDoc = {
  id: "ICF-AETHER-01",
  version: "v2.1",
  date: "12 March 2026",
  status: "Unverified" as const,
  statusNote:
    "This preview has no authorized approval list, so the consent version is marked unverified.",
  filename: "synthetic-consent-aether-01-v2.1.pdf",
};

export const protocolDoc = {
  id: "PROT-AETHER-01",
  version: "v3.0",
  date: "2 March 2026",
  status: "Unverified" as const,
  filename: "synthetic-protocol-aether-01-v3.0.pdf",
};

export const sections: Section[] = [
  {
    id: "procedures",
    index: "01",
    title: "Study procedures and time commitment",
    short: "Visits, time, and how assignment works",
    original:
      "You will come to the study clinic 6 times over about 16 weeks. Each visit lasts about 2 hours. Visits include a headache diary review and vital signs. A blood sample of about 2 teaspoons is taken at visits 1, 3, and 6. You will be assigned by chance to Aetherol or placebo. Neither you nor the study doctor will know which one you receive during the study.",
    plain:
      "The clinic asks you to come in 6 times across about 16 weeks. A visit takes about 2 hours. Some visits include a small blood draw of about 2 teaspoons. A chance process assigns you to Aetherol or placebo. You and the study doctor are not told which one you receive while the study is going on.",
    citation: "Consent §4.1 Procedures",
    page: "p. 4",
    terms: [
      {
        word: "Placebo",
        meaning: "A product with no active study drug, used so the groups can be compared.",
      },
      {
        word: "Assigned by chance",
        meaning:
          "A process, not a choice by you or the doctor, decides which group you join.",
      },
    ],
    ask: "How many clinic visits are in this study, and how long is each one?",
  },
  {
    id: "risks",
    index: "02",
    title: "Risks and possible benefits",
    short: "What the form says could happen",
    original:
      "Aetherol may cause nausea, dizziness, or fatigue. In earlier studies described in this form, about 1 in 10 people reported nausea. Rare allergic reactions are possible. Placebo has no active drug, but blood draws can cause bruising. This study may not help your migraines. There is no promise of benefit.",
    plain:
      "Aetherol can cause nausea, dizziness, or tiredness. This form says about 1 in 10 people in earlier studies felt nausea. Allergic reactions are described as rare. Blood draws can bruise. The form does not promise that the study will help your migraines.",
    citation: "Consent §5.2 Risks and benefits",
    page: "p. 6",
    terms: [
      {
        word: "Fatigue",
        meaning: "Tiredness that is more than ordinary end-of-day tiredness.",
      },
      {
        word: "No promise of benefit",
        meaning: "The study is research. It is not a guarantee that you will feel better.",
      },
    ],
    ask: "What risks does the consent form describe, and does it promise a benefit?",
  },
  {
    id: "rights",
    index: "03",
    title: "Participant rights and withdrawal",
    short: "You can leave",
    original:
      "Taking part is voluntary. You may leave the study at any time. Leaving will not change the medical care you otherwise receive from your own doctor. If you leave, the study team may ask to keep safety information already recorded. You will be told about new information that could affect your choice to stay.",
    plain:
      "You can say no, and you can leave later. Leaving does not take away regular care from your own doctor. The team may keep safety information already collected. They must tell you about new information that could change your decision to stay.",
    citation: "Consent §6.1 Voluntary participation",
    page: "p. 7",
    terms: [
      {
        word: "Voluntary",
        meaning: "Your choice. You do not have to join, and you do not have to stay.",
      },
    ],
    ask: "What happens if I decide to leave the study?",
  },
  {
    id: "costs",
    index: "04",
    title: "Costs and compensation",
    short: "What you pay and what you receive",
    original:
      "The study drug, placebo, and study-required visits are provided at no cost to you. You will receive $50 for each completed clinic visit, paid after the visit. The study does not pay for your usual migraine care or for travel beyond that visit payment.",
    plain:
      "You do not pay for the study drug or the required study visits. You receive $50 after each clinic visit you complete. That payment does not cover your usual migraine care or extra travel costs.",
    citation: "Consent §7.1 Costs and payments",
    page: "p. 8",
    terms: [
      {
        word: "Compensation",
        meaning: "The payment the form says you receive for a completed study visit.",
      },
    ],
    ask: "Will I be paid, and do I have to pay for the study visits?",
  },
  {
    id: "privacy",
    index: "05",
    title: "Privacy and use of data",
    short: "Who can see coded records",
    original:
      "Study records use a code instead of your name. The sponsor, the study doctor, and monitors may review coded records to check the study. Records may be kept for 15 years. Results may be shared in journals without your name. Your name is not placed in the public study listing.",
    plain:
      "Your name is replaced with a code in study records. The sponsor and monitors can see coded records to check that the study was done as written. Records may be kept for 15 years. Published results and the public listing do not include your name.",
    citation: "Consent §8.3 Confidentiality",
    page: "p. 9",
    terms: [
      {
        word: "Coded records",
        meaning: "Records labeled with a study code rather than your name.",
      },
      {
        word: "Monitor",
        meaning: "A person who reviews study records to check the conduct of the study.",
      },
    ],
    ask: "Who can see my study records, and will my name be published?",
  },
];

export const facts: Fact[] = [
  {
    id: "visits",
    label: "Clinic visits",
    protocolValue: "8 visits",
    consentValue: "6 visits",
    protocolQuote:
      "Participants complete 8 clinic visits during the 24-week treatment period.",
    consentQuote: "You will come to the study clinic 6 times over about 16 weeks.",
    protocolSource: "Protocol §6.2 Schedule of assessments",
    consentSource: "Consent §4.1 Procedures",
    why: "The visit count is not the same number in the two synthetic documents.",
  },
  {
    id: "duration",
    label: "Study duration",
    protocolValue: "24 weeks",
    consentValue: "about 16 weeks",
    protocolQuote:
      "The treatment period is 24 weeks, with the last clinic visit at week 24.",
    consentQuote: "You will come to the study clinic 6 times over about 16 weeks.",
    protocolSource: "Protocol §6.1 Study design",
    consentSource: "Consent §4.1 Procedures",
    why: "The stated length of participation does not match.",
  },
  {
    id: "pay",
    label: "Visit payment",
    protocolValue: "$80 per completed visit",
    consentValue: "$50 per completed visit",
    protocolQuote: "Participants are compensated $80 for each completed clinic visit.",
    consentQuote: "You will receive $50 for each completed clinic visit, paid after the visit.",
    protocolSource: "Protocol §11.4 Compensation",
    consentSource: "Consent §7.1 Costs and payments",
    why: "The payment amount for a completed visit is different.",
  },
  {
    id: "blood",
    label: "Blood volume",
    protocolValue: "about 2 teaspoons",
    consentValue: "about 2 teaspoons",
    protocolQuote: "Each scheduled blood sample is approximately 10 mL, about 2 teaspoons.",
    consentQuote: "A blood sample of about 2 teaspoons is taken at visits 1, 3, and 6.",
    protocolSource: "Protocol §6.4 Laboratory samples",
    consentSource: "Consent §4.1 Procedures",
    why: "The stated sample volume matches in this synthetic pair.",
  },
  {
    id: "retention",
    label: "Record retention",
    protocolValue: "15 years",
    consentValue: "15 years",
    protocolQuote: "Essential documents are retained for 15 years after study completion.",
    consentQuote: "Records may be kept for 15 years.",
    protocolSource: "Protocol §12.2 Record retention",
    consentSource: "Consent §8.3 Confidentiality",
    why: "The retention period matches in this synthetic pair.",
  },
];

export function factFlagged(fact: Fact): boolean {
  return fact.protocolValue !== fact.consentValue;
}

export const plainDraft = {
  sectionId: "costs" as SectionId,
  title: "Costs and compensation",
  original: sections.find((section) => section.id === "costs")!.original,
  draft:
    "You come to the clinic 6 times over about 16 weeks. After each visit you complete, you receive $50. You do not pay for the study drug or those required visits. The payment does not cover your usual migraine care.",
  mustKeep: ["6 times", "16 weeks", "$50"],
  mustNotAdd: ["8 visits", "24 weeks", "$80", "promise"],
};

export const versions = [
  {
    id: consentDoc.id,
    kind: "Consent form",
    version: consentDoc.version,
    date: consentDoc.date,
    status: consentDoc.status,
    note: "Selected for the participant reader.",
  },
  {
    id: "ICF-AETHER-01",
    kind: "Consent form",
    version: "v2.0",
    date: "18 February 2026",
    status: "Outdated" as const,
    note: "Earlier synthetic draft. Not the version opened in the reader.",
  },
  {
    id: protocolDoc.id,
    kind: "Protocol",
    version: protocolDoc.version,
    date: protocolDoc.date,
    status: protocolDoc.status,
    note: "Used only on the document integrity screen.",
  },
];

export const teachPrompts: TeachPrompt[] = [
  {
    id: "randomization",
    sectionId: "procedures",
    topic: "Assignment",
    question:
      "In your own words, how is it decided whether you receive Aetherol or placebo, and who knows which one you receive?",
    concepts: [
      {
        id: "chance",
        label: "Assignment is by chance",
        phrases: ["chance", "random", "not my choice", "not a choice"],
      },
      {
        id: "blind-you",
        label: "You are not told which one you receive",
        phrases: ["i will not know", "i won't know", "not told", "don't know which", "do not know which"],
      },
      {
        id: "blind-doctor",
        label: "The study doctor is not told during the study",
        phrases: [
          "doctor will not know",
          "doctor won't know",
          "doctor is not told",
          "doctor isn't told",
          "neither you nor the study doctor",
        ],
      },
    ],
    reexplain:
      "A chance process picks Aetherol or placebo. During the study, you are not told which one it is, and the study doctor is not told either.",
  },
  {
    id: "withdrawal",
    sectionId: "rights",
    topic: "Leaving the study",
    question: "What happens if you decide to leave the study?",
    concepts: [
      {
        id: "anytime",
        label: "You may leave at any time",
        phrases: ["any time", "anytime", "leave", "withdraw", "stop"],
      },
      {
        id: "care",
        label: "Regular care from your own doctor continues",
        phrases: ["own doctor", "regular care", "medical care", "my doctor"],
      },
      {
        id: "safety",
        label: "Safety information already collected may be kept",
        phrases: ["safety", "already collected", "already recorded", "already have"],
      },
    ],
    reexplain:
      "You can leave at any time. Leaving does not change the regular care you get from your own doctor. The team may keep safety information that was already recorded.",
  },
  {
    id: "risk",
    sectionId: "risks",
    topic: "Risks",
    question: "What should you know about risks and whether the study will help?",
    concepts: [
      {
        id: "effects",
        label: "Nausea, dizziness, or fatigue are named",
        phrases: ["nausea", "dizziness", "dizzy", "fatigue", "tired"],
      },
      {
        id: "benefit",
        label: "The form does not promise a benefit",
        phrases: ["no promise", "may not help", "not a promise", "might not help", "does not promise"],
      },
    ],
    reexplain:
      "The form says Aetherol may cause nausea, dizziness, or fatigue. It also says the study may not help your migraines. There is no promise of benefit.",
  },
];

export const teachFixtures: { promptId: string; response: string; note: string }[] = [
  {
    promptId: "withdrawal",
    response:
      "I can leave at any time. My own doctor still gives regular care. They can keep safety information already collected.",
    note: "Covers every concept in the withdrawal key.",
  },
  {
    promptId: "withdrawal",
    response: "I can leave at any time if I want.",
    note: "Names the right to leave and misses care and safety records.",
  },
  {
    promptId: "risk",
    response: "I consent and I understand everything.",
    note: "A yes does not show the named risks or the lack of a promised benefit.",
  },
  {
    promptId: "randomization",
    response: "I don't know.",
    note: "The person is asking for a human explanation.",
  },
];

export function sectionById(id: SectionId): Section {
  const section = sections.find((item) => item.id === id);
  if (!section) {
    throw new Error(`Unknown section ${id}`);
  }
  return section;
}
