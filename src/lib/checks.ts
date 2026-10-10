import { factFlagged, facts, plainDraft, teachFixtures } from "../data/study";
import { answerQuestion, knownSectionIds } from "./answers";
import { assessTeachback } from "./teachback";

export type Check = {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
};

export function auditPlainDraft(): { passed: boolean; notes: string[] } {
  const notes = [
    ...plainDraft.mustKeep.map((token) =>
      plainDraft.draft.includes(token)
        ? `Keeps “${token}” from the consent form.`
        : `Missing “${token}” from the consent form.`,
    ),
    ...plainDraft.mustNotAdd.map((token) =>
      plainDraft.draft.toLowerCase().includes(token.toLowerCase())
        ? `Adds “${token}”, which is not the consent wording.`
        : `Does not import “${token}” from the other document.`,
    ),
  ];
  const passed =
    plainDraft.mustKeep.every((token) => plainDraft.draft.includes(token)) &&
    plainDraft.mustNotAdd.every((token) => !plainDraft.draft.toLowerCase().includes(token.toLowerCase()));
  return { passed, notes };
}

export function runChecks(): Check[] {
  const checks: Check[] = [];
  const visits = answerQuestion("How many clinic visits are in this study?");
  checks.push({
    id: "cite-visits",
    name: "Visit question cites the consent procedures",
    passed: visits.supported && visits.sectionId === "procedures" && /6 times/.test(visits.answer),
    detail: visits.supported ? visits.citation ?? "Missing citation" : "Unsupported",
  });

  const dose = answerQuestion("What dose of Aetherol will I get?");
  checks.push({
    id: "unsupported-dose",
    name: "A dose question is not invented",
    passed: !dose.supported && !dose.citation,
    detail: dose.answer,
  });

  const help = answerQuestion("Will this study help my migraines?");
  checks.push({
    id: "no-promise",
    name: "Benefit question keeps the form’s limit",
    passed:
      help.supported &&
      help.sectionId === "risks" &&
      /no promise of benefit/i.test(help.answer),
    detail: help.answer,
  });

  const unknown = answerQuestion("Can my cousin enroll with me next week?");
  checks.push({
    id: "unknown-fallback",
    name: "An unstated question falls back to a person",
    passed: !unknown.supported,
    detail: unknown.answer,
  });

  checks.push({
    id: "citations-real",
    name: "Supported answers point at a real section",
    passed: [visits, help].every(
      (result) => !!result.sectionId && knownSectionIds().includes(result.sectionId),
    ),
    detail: [visits.citation, help.citation].filter(Boolean).join(" · "),
  });

  const full = assessTeachback(teachFixtures[0].promptId, teachFixtures[0].response);
  checks.push({
    id: "teach-full",
    name: "Complete withdrawal answer",
    passed: full.label === "Understands the key concept",
    detail: full.label,
  });

  const partial = assessTeachback(teachFixtures[1].promptId, teachFixtures[1].response);
  checks.push({
    id: "teach-partial",
    name: "Partial withdrawal answer",
    passed: partial.label === "Partially understands" && partial.missing.length > 0,
    detail: `${partial.label}: missing ${partial.missing.join(", ")}`,
  });

  const gesture = assessTeachback(teachFixtures[2].promptId, teachFixtures[2].response);
  checks.push({
    id: "teach-gesture",
    name: "“I consent” is not treated as understanding",
    passed: gesture.label === "Needs clarification",
    detail: gesture.label,
  });

  const human = assessTeachback(teachFixtures[3].promptId, teachFixtures[3].response);
  checks.push({
    id: "teach-human",
    name: "“I don’t know” asks for a person",
    passed: human.label === "Requires human follow-up",
    detail: human.label,
  });

  const flagged = facts.filter(factFlagged).map((fact) => fact.id);
  checks.push({
    id: "seeded-flags",
    name: "Seeded mismatches are the visit count, duration, and payment",
    passed:
      flagged.length === 3 &&
      flagged.includes("visits") &&
      flagged.includes("duration") &&
      flagged.includes("pay") &&
      !flagged.includes("retention"),
    detail: flagged.join(", "),
  });

  const draft = auditPlainDraft();
  checks.push({
    id: "plain-fidelity",
    name: "Plain-language draft keeps consent facts",
    passed: draft.passed,
    detail: draft.notes.join(" "),
  });

  return checks;
}
