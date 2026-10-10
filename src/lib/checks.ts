import { listPassages } from "../data/documents";
import { consentDoc, factFlagged, facts, plainDraft, sectionById, teachFixtures } from "../data/study";
import { answerQuestion, knownSectionIds } from "./answers";
import { inspectText, rejectUpload } from "./ingest";
import { validateModelDraft } from "./ollama";
import { auditPlainText } from "./plain";
import { retrievePassages } from "./retrieve";
import { assessTeachback } from "./teachback";

export type Check = {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
};

export function auditPlainDraft(): { passed: boolean; notes: string[] } {
  return auditPlainText(plainDraft.draft);
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
      (result) => !!result.sectionId && knownSectionIds().some((id) => id === result.sectionId),
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

  const procedures = sectionById("procedures");
  checks.push({
    id: "version-and-quote",
    name: "Visit answer cites consent v2.1 and the source sentence",
    passed:
      visits.version === consentDoc.version &&
      visits.documentId === consentDoc.id &&
      visits.quote === procedures.original &&
      procedures.original.includes("6 times") &&
      !/8 visits|\$80|24 weeks/.test(visits.answer),
    detail: `${visits.documentId} ${visits.version} · ${visits.citation}`,
  });

  const disagreement = answerQuestion("Do the protocol and the consent disagree?");
  checks.push({
    id: "disagreement-shown",
    name: "A disagreement question shows both documents",
    passed:
      disagreement.supported &&
      disagreement.answer.includes("8 clinic visits") &&
      disagreement.answer.includes("6 times") &&
      disagreement.answer.includes("$80") &&
      disagreement.answer.includes("$50") &&
      disagreement.answer.includes("does not choose"),
    detail: disagreement.answer,
  });

  const retrieved = retrievePassages("How many clinic visits are in this study?");
  const outdated = retrievePassages("8 clinic visits over 24 weeks", {
    usableOnly: false,
    documentId: null,
    version: null,
  });
  checks.push({
    id: "retrieval-current",
    name: "Visit search uses the current consent and keeps the outdated form out",
    passed:
      retrieved[0]?.passage.sectionId === "procedures" &&
      retrieved.every((item) => item.passage.version === "v2.1" && item.passage.usable) &&
      outdated.some((item) => item.passage.version === "v2.0" && !item.passage.usable),
    detail: retrieved[0]?.passage.id ?? "No passage",
  });

  const fake = validateModelDraft('{"supported":true,"answer":"You come 6 times.","passageIds":["made-up"]}', [
    { id: "ICF-AETHER-01:v2.1:procedures", text: procedures.original },
  ]);
  const leaked = validateModelDraft(
    '{"supported":true,"answer":"You will be paid $80.","passageIds":["ICF-AETHER-01:v2.1:procedures"]}',
    [{ id: "ICF-AETHER-01:v2.1:procedures", text: procedures.original }],
  );
  checks.push({
    id: "model-citation-guard",
    name: "A model citation must be a real passage and cannot add an absent figure",
    passed: fake === null && leaked === null,
    detail: "Invented ids and $80 are rejected.",
  });

  const emptyFile = inspectText("empty.txt", "   ");
  const pdf = rejectUpload({ name: "scan.pdf", type: "application/pdf", size: 1200 });
  const otherStudy = inspectText(
    "other.txt",
    "document-id: X\nversion: v1\ndate: 1 January 2026\nstudy: OTHER-01\nkind: consent\nstatus: Unverified\nusable: yes\n\n---\nsection: a\nheading: A\npage: p. 1\ncitation: Other\n\nHello",
  );
  checks.push({
    id: "ingest-guards",
    name: "Empty files, PDFs, and other studies are not indexed",
    passed: !emptyFile.ok && pdf !== null && !otherStudy.ok,
    detail: [emptyFile.ok ? "" : emptyFile.error, pdf, otherStudy.ok ? "" : otherStudy.error].filter(Boolean).join(" "),
  });

  const dropped = auditPlainText(plainDraft.draft.replace("$50", "a payment"));
  const hype = auditPlainText(`${plainDraft.draft} This is a breakthrough.`);
  checks.push({
    id: "plain-edit-guard",
    name: "An edited draft cannot drop $50 or add promotional wording",
    passed: !dropped.passed && !hype.passed && plainDraft.original !== plainDraft.draft,
    detail: "The source clause stays the original passage.",
  });

  checks.push({
    id: "fact-kind",
    name: "Only unequal shared facts are confirmed textual differences",
    passed: facts.every((fact) => (fact.protocolValue !== fact.consentValue) === (fact.kind === "confirmed-textual-difference")),
    detail: facts.map((fact) => `${fact.id}:${fact.kind}`).join(", "),
  });

  checks.push({
    id: "source-files",
    name: "Seeded passages exist for the current consent, the outdated consent, and the protocol",
    passed:
      listPassages().some((passage) => passage.version === "v2.1" && passage.usable && passage.kind === "consent") &&
      listPassages().some((passage) => passage.version === "v2.0" && !passage.usable) &&
      listPassages().some((passage) => passage.documentId === "PROT-AETHER-01" && passage.kind === "protocol"),
    detail: `${listPassages().length} passages`,
  });

  return checks;
}
