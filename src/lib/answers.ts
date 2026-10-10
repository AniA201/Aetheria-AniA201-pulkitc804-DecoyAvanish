import { sectionById, sections, type SectionId } from "../data/study";

export type Answer = {
  supported: boolean;
  answer: string;
  sectionId?: SectionId;
  citation?: string;
  quote?: string;
  page?: string;
};

type Rule = {
  id: string;
  sectionId: SectionId;
  match: (text: string) => boolean;
  answer: string;
};

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

const rules: Rule[] = [
  {
    id: "visits",
    sectionId: "procedures",
    match: (text) =>
      has(text, /visit|schedule|how many times|how often|how long is each|blood|teaspoon|2 hours/),
    answer:
      "The selected consent form says you come to the clinic 6 times over about 16 weeks. Each visit lasts about 2 hours. A blood sample of about 2 teaspoons is taken at visits 1, 3, and 6.",
  },
  {
    id: "assignment",
    sectionId: "procedures",
    match: (text) =>
      has(text, /placebo|chance|random|which (drug|one)|know which|blind|assigned/),
    answer:
      "The consent form says you are assigned by chance to Aetherol or placebo. Neither you nor the study doctor will know which one you receive during the study.",
  },
  {
    id: "risks",
    sectionId: "risks",
    match: (text) =>
      has(text, /risk|side effect|nausea|dizz|fatigue|tired|allerg|benefit|help my|promise|safe/),
    answer:
      "The consent form says Aetherol may cause nausea, dizziness, or fatigue, and that about 1 in 10 people in earlier studies described in the form reported nausea. Rare allergic reactions are possible. Blood draws can bruise. The form says the study may not help your migraines and makes no promise of benefit.",
  },
  {
    id: "rights",
    sectionId: "rights",
    match: (text) =>
      has(text, /withdraw|leave the study|quit|drop out|voluntary|stop participating|say no|new information/),
    answer:
      "Taking part is voluntary. You may leave at any time. Leaving will not change the medical care you otherwise receive from your own doctor. The team may keep safety information already recorded, and you will be told about new information that could affect your choice to stay.",
  },
  {
    id: "costs",
    sectionId: "costs",
    match: (text) => has(text, /pay|paid|payment|cost|compensat|\$50|money|travel|free/),
    answer:
      "The study drug, placebo, and study-required visits are at no cost to you. The consent form says you receive $50 for each completed clinic visit. It does not pay for your usual migraine care or for travel beyond that visit payment.",
  },
  {
    id: "privacy",
    sectionId: "privacy",
    match: (text) =>
      has(text, /privacy|private|record|confidential|who can see|my name|data|journal|15 years|kept/),
    answer:
      "Study records use a code instead of your name. The sponsor, the study doctor, and monitors may review coded records. Records may be kept for 15 years. Results may be shared without your name, and your name is not placed in the public study listing.",
  },
];

const unsupported =
  /dose|dosage|milligram|mg\b|pregnant|pregnancy|ibuprofen|current medicine|my medicine|other medicine|irb|approved by|fda|cure|guarantee/;

export const suggestedQuestions: { id: string; text: string; topic: SectionId }[] = [
  {
    id: "visits",
    topic: "procedures",
    text: "How many clinic visits are in this study, and how long is each one?",
  },
  {
    id: "assignment",
    topic: "procedures",
    text: "Will I know whether I receive Aetherol or placebo?",
  },
  {
    id: "risks",
    topic: "risks",
    text: "What risks does the form describe, and does it promise a benefit?",
  },
  {
    id: "rights",
    topic: "rights",
    text: "Can I leave the study if I change my mind?",
  },
  {
    id: "costs",
    topic: "costs",
    text: "Will I be paid, and what costs are covered?",
  },
  {
    id: "privacy",
    topic: "privacy",
    text: "Who can see my records, and is my name published?",
  },
];

export function answerQuestion(input: string): Answer {
  const text = input.trim().toLowerCase();
  if (!text) {
    return {
      supported: false,
      answer: "Ask a question about the selected consent form.",
    };
  }

  if (unsupported.test(text)) {
    return {
      supported: false,
      answer:
        "The selected consent form does not answer that. Aetheria will not guess a dose, a personal treatment decision, an approval status, or a cure. Please ask the research coordinator.",
    };
  }

  const rule = rules.find((item) => item.match(text));
  if (!rule) {
    return {
      supported: false,
      answer:
        "I cannot find that in the selected consent form. I will not fill the gap with a guess. Save the question for the research coordinator.",
    };
  }

  const section = sectionById(rule.sectionId);
  return {
    supported: true,
    answer: rule.answer,
    sectionId: section.id,
    citation: section.citation,
    quote: section.original,
    page: section.page,
  };
}

export function knownSectionIds(): SectionId[] {
  return sections.map((section) => section.id);
}
