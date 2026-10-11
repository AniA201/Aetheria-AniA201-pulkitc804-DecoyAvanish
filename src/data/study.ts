import { passageBy } from "./documents";

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

export type FactKind = "confirmed-textual-difference" | "consistent";

export type Fact = {
  id: string;
  label: string;
  kind: FactKind;
  protocolValue: string;
  consentValue: string;
  protocolQuote: string;
  consentQuote: string;
  protocolSource: string;
  consentSource: string;
  why: string;
};

function consentPassage(sectionId: string) {
  return passageBy("ICF-AETHER-01", "v2.1", sectionId);
}

function protocolPassage(sectionId: string) {
  return passageBy("PROT-AETHER-01", "v3.0", sectionId);
}

export type TeachConcept = {
  id: string;
  label: string;
  phrases: string[];
};

export type Misconception = {
  id: string;
  label: string;
  phrases: string[];
};

export type TeachPrompt = {
  id: string;
  sectionId: string;
  topic: string;
  question: string;
  concepts: TeachConcept[];
  reexplain: string;
  misconceptions?: Misconception[];
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
  filename: "ICF-AETHER-01-v2.1.txt",
};

export const protocolDoc = {
  id: "PROT-AETHER-01",
  version: "v3.0",
  date: "2 March 2026",
  status: "Unverified" as const,
  filename: "PROT-AETHER-01-v3.0.txt",
};

export const sections: Section[] = [
  {
    id: "procedures",
    index: "01",
    title: "Study procedures and time commitment",
    short: "6 visits, about 16 weeks, group chosen by chance",
    original: consentPassage("procedures").text,
    plain:
      "You visit the clinic 6 times over about 16 weeks. Each visit takes about 2 hours. Some include a blood draw of about 2 teaspoons. Chance decides whether you get Aetherol or placebo. You and the study doctor will not know which.",
    citation: consentPassage("procedures").citation,
    page: consentPassage("procedures").page,
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
    short: "Nausea, dizziness, bruising; no promised benefit",
    original: consentPassage("risks").text,
    plain:
      "Aetherol may cause nausea, dizziness, or tiredness. About 1 in 10 people in earlier studies had nausea. Rare allergic reactions and bruising from blood draws are possible. The study may not help your migraines.",
    citation: consentPassage("risks").citation,
    page: consentPassage("risks").page,
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
    short: "You can leave without losing regular care",
    original: consentPassage("rights").text,
    plain:
      "Joining is your choice. You can leave at any time without losing your regular care. The team may keep safety information already collected. They will tell you about new information that could change your choice.",
    citation: consentPassage("rights").citation,
    page: consentPassage("rights").page,
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
    short: "No charge for study visits; $50 per completed visit",
    original: consentPassage("costs").text,
    plain:
      "The study drug and required visits cost you nothing. You get $50 after each visit you complete. The study does not pay for your usual migraine care or extra travel.",
    citation: consentPassage("costs").citation,
    page: consentPassage("costs").page,
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
    short: "Coded records may be kept for 15 years",
    original: consentPassage("privacy").text,
    plain:
      "Study records use a code instead of your name. The sponsor, study doctor, and monitors may review them. Records may be kept for 15 years. Your name will not appear in published results or the public listing.",
    citation: consentPassage("privacy").citation,
    page: consentPassage("privacy").page,
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
    kind: "confirmed-textual-difference",
    protocolValue: "8 visits",
    consentValue: "6 visits",
    protocolQuote: protocolPassage("visits").text,
    consentQuote: "You will come to the study clinic 6 times over about 16 weeks.",
    protocolSource: protocolPassage("visits").citation,
    consentSource: consentPassage("procedures").citation,
    why: "The consent says 6 visits; the protocol says 8. The study team needs to confirm which number participants should be told.",
  },
  {
    id: "duration",
    label: "Study duration",
    kind: "confirmed-textual-difference",
    protocolValue: "24 weeks",
    consentValue: "about 16 weeks",
    protocolQuote: protocolPassage("duration").text,
    consentQuote: "You will come to the study clinic 6 times over about 16 weeks.",
    protocolSource: protocolPassage("duration").citation,
    consentSource: consentPassage("procedures").citation,
    why: "The consent says about 16 weeks; the protocol says 24. The study team needs to confirm the schedule.",
  },
  {
    id: "pay",
    label: "Visit payment",
    kind: "confirmed-textual-difference",
    protocolValue: "$80 per completed visit",
    consentValue: "$50 per completed visit",
    protocolQuote: protocolPassage("pay").text,
    consentQuote: "You will receive $50 for each completed clinic visit, paid after the visit.",
    protocolSource: protocolPassage("pay").citation,
    consentSource: consentPassage("costs").citation,
    why: "The consent says $50 per completed visit; the protocol says $80. The study team needs to confirm the payment.",
  },
  {
    id: "blood",
    label: "Blood volume",
    kind: "consistent",
    protocolValue: "about 2 teaspoons",
    consentValue: "about 2 teaspoons",
    protocolQuote: protocolPassage("blood").text,
    consentQuote: "A blood sample of about 2 teaspoons is taken at visits 1, 3, and 6.",
    protocolSource: protocolPassage("blood").citation,
    consentSource: consentPassage("procedures").citation,
    why: "Both documents say the blood sample is about 2 teaspoons.",
  },
  {
    id: "retention",
    label: "Record retention",
    kind: "consistent",
    protocolValue: "15 years",
    consentValue: "15 years",
    protocolQuote: protocolPassage("retention").text,
    consentQuote: "Records may be kept for 15 years.",
    protocolSource: protocolPassage("retention").citation,
    consentSource: consentPassage("privacy").citation,
    why: "Both documents say records may be kept for 15 years.",
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
    "You visit the clinic 6 times over about 16 weeks. You get $50 after each visit you complete. The study drug and required visits cost you nothing. Your usual migraine care and extra travel are not covered.",
  mustKeep: ["6 times", "16 weeks", "$50"],
  mustNotAdd: ["8 visits", "24 weeks", "$80", "promise"],
  reason:
    "Shorter sentences. The consent’s own figures stay: 6 times, about 16 weeks, and $50. Protocol figures are not copied. Accepting this suggestion does not change the source clause.",
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
    misconceptions: [
      {
        id: "will-get-drug",
        label: "that you will definitely get Aetherol",
        phrases: ["definitely get", "i'll get the new drug", "i will get the new drug", "i get the new drug", "sure to get", "guaranteed to get"],
      },
      {
        id: "chooser",
        label: "that someone chooses your group",
        phrases: ["i get to choose", "i can choose", "i choose", "doctor chooses", "doctor picks", "doctor decides which"],
      },
    ],
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
    misconceptions: [
      {
        id: "cannot-leave",
        label: "that you cannot leave once you start",
        phrases: ["can't leave", "cannot leave", "can not leave", "can't quit", "cannot quit", "can't stop", "cannot stop", "have to stay", "must stay", "have to finish", "must finish"],
      },
      {
        id: "lose-care",
        label: "that leaving costs you your regular care",
        phrases: ["lose my care", "lose my doctor", "lose my regular", "lose her care", "lose his care", "lose their care", "no longer treat"],
      },
    ],
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
    misconceptions: [
      {
        id: "promised-benefit",
        label: "that the study will help or cure your migraines",
        phrases: ["will cure", "guaranteed to help", "definitely help", "sure to help", "it will fix"],
      },
      {
        id: "no-risk",
        label: "that there are no risks",
        phrases: ["no side effects", "no risks", "no risk", "completely safe", "totally safe"],
      },
    ],
  },
  {
    id: "costs",
    sectionId: "costs",
    topic: "Costs and payment",
    question: "In your own words, what do you pay for, what are you paid, and what does the study not cover?",
    concepts: [
      {
        id: "no-cost",
        label: "The study drug and required visits cost you nothing",
        phrases: ["no cost", "free", "don't pay", "do not pay", "doesn't cost", "does not cost", "not pay for the study"],
      },
      {
        id: "payment",
        label: "You receive $50 for each completed visit",
        phrases: ["$50", "50 dollars", "fifty dollars", "fifty"],
      },
      {
        id: "usual-care",
        label: "Usual migraine care is not paid by the study",
        phrases: ["usual", "regular care", "normal care", "not cover", "doesn't cover", "does not cover", "own care"],
      },
    ],
    reexplain:
      "The study drug, placebo, and required visits cost you nothing. You receive $50 after each clinic visit you complete. The study does not pay for your usual migraine care or extra travel.",
    misconceptions: [
      {
        id: "research-is-care",
        label: "that the study replaces or pays for your regular care",
        phrases: ["pays for all my", "pays for my regular", "covers my regular", "covers all my", "replaces my doctor", "instead of my doctor", "instead of my regular", "my regular care is free", "my migraine care is free"],
      },
    ],
  },
  {
    id: "privacy",
    sectionId: "privacy",
    topic: "Privacy",
    question: "In your own words, who can see your study records, and is your name shared?",
    concepts: [
      {
        id: "coded",
        label: "Records use a code instead of your name",
        phrases: ["code", "coded", "instead of my name", "not my name"],
      },
      {
        id: "reviewers",
        label: "The sponsor, study doctor, and monitors may review coded records",
        phrases: ["sponsor", "monitor", "study doctor", "study team"],
      },
      {
        id: "not-public",
        label: "Your name is not published or in the public listing",
        phrases: ["not published", "not in the public", "without my name", "name is not", "name isn't", "won't be published", "not shared"],
      },
    ],
    reexplain:
      "Your records carry a code instead of your name. The sponsor, the study doctor, and monitors may review those coded records. Your name is not published and is not in the public study listing.",
    misconceptions: [
      {
        id: "name-public",
        label: "that your name will be made public",
        phrases: ["my name will be published", "my name is public", "everyone can see", "anyone can see", "name will be online"],
      },
    ],
  },
];

export type PersonaFixture = {
  id: string;
  persona: string;
  promptId: string;
  response: string;
  speaker: "participant" | "caregiver";
  expect: Understanding;
};

type Understanding =
  | "Understands the key concept"
  | "Partially understands"
  | "Needs clarification"
  | "Requires human follow-up";

/** The personas named in the Teach It Back starter sheet, written as practice replies. */
export const personaFixtures: PersonaFixture[] = [
  {
    id: "randomization",
    persona: "Misunderstands randomization",
    promptId: "randomization",
    response: "So I'll definitely get the new drug?",
    speaker: "participant",
    expect: "Needs clarification",
  },
  {
    id: "cannot-quit",
    persona: "Thinks they can't quit",
    promptId: "withdrawal",
    response: "Once I start I can't quit until the study is over.",
    speaker: "participant",
    expect: "Needs clarification",
  },
  {
    id: "research-care",
    persona: "Confuses research visits with regular care",
    promptId: "costs",
    response: "The study pays for all my migraine care now, so it replaces my doctor.",
    speaker: "participant",
    expect: "Needs clarification",
  },
  {
    id: "caregiver",
    persona: "Caregiver speaking for the participant",
    promptId: "withdrawal",
    response: "She can leave at any time. Her own doctor still treats her, and the team may keep safety information already recorded.",
    speaker: "caregiver",
    expect: "Understands the key concept",
  },
  {
    id: "spanish",
    persona: "Spanish speaker",
    promptId: "withdrawal",
    response: "Puedo salir del estudio en cualquier momento y mi médico sigue atendiéndome.",
    speaker: "participant",
    expect: "Partially understands",
  },
  {
    id: "french",
    persona: "French speaker",
    promptId: "withdrawal",
    response: "Je peux partir à tout moment et mon médecin continue à me soigner.",
    speaker: "participant",
    expect: "Partially understands",
  },
  {
    id: "mandarin",
    persona: "Mandarin speaker",
    promptId: "risk",
    response: "参加以后就一定会治好我的偏头痛，没有风险。",
    speaker: "participant",
    expect: "Needs clarification",
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
