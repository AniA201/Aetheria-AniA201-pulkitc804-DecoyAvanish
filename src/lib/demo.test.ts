import { describe, expect, it } from "vitest";
import { listPassages, passageBy } from "../data/documents";
import { consentDoc, factFlagged, facts, plainDraft, sectionById } from "../data/study";
import { answerQuestion } from "./answers";
import { runChecks } from "./checks";
import { auditPlainText } from "./plain";
import { isOpenReview, reviewLabel } from "./preflight";
import { assessTeachback } from "./teachback";

describe("Aetheria demonstration workflow", () => {
  it("loads the synthetic protocol and both consent versions", () => {
    const current = passageBy(consentDoc.id, consentDoc.version, "procedures");
    const outdated = listPassages().find((passage) => passage.version === "v2.0");
    const protocol = passageBy("PROT-AETHER-01", "v3.0", "visits");
    expect(current.usable).toBe(true);
    expect(current.text).toContain("6 times");
    expect(outdated?.usable).toBe(false);
    expect(outdated?.text).toContain("8 times");
    expect(protocol.text).toContain("8 clinic visits");
  });

  it("keeps a plain-language reading beside the original clause", () => {
    const source = sectionById(plainDraft.sectionId).original;
    expect(plainDraft.original).toBe(source);
    expect(auditPlainText(plainDraft.draft).passed).toBe(true);
    expect(source).toContain("$50");
    expect(plainDraft.draft).not.toBe(source);
  });

  it("answers from the current consent and refuses a missing answer", () => {
    const visits = answerQuestion("How many clinic visits are in this study?");
    const missing = answerQuestion("Can my cousin enroll with me next week?");
    expect(visits.supported).toBe(true);
    expect(visits.version).toBe("v2.1");
    expect(visits.quote).toContain("6 times");
    expect(visits.answer).not.toContain("$80");
    expect(missing.supported).toBe(false);
    expect(missing.citation).toBeUndefined();
  });

  it("gives concept feedback and does not treat a yes as understanding", () => {
    const taught = assessTeachback(
      "withdrawal",
      "I can leave at any time. My own doctor still gives regular care. They can keep safety information already collected.",
    );
    const gesture = assessTeachback("risk", "I consent");
    expect(taught.label).toBe("Understands the key concept");
    expect(taught.version).toBe(consentDoc.version);
    expect(gesture.label).toBe("Needs clarification");
  });

  it("detects the seeded differences and records a human label without editing either document", () => {
    const flagged = facts.filter(factFlagged);
    expect(flagged.map((fact) => fact.id)).toEqual(["visits", "duration", "pay"]);
    expect(reviewLabel("dismissed")).toBe("Not a discrepancy");
    expect(isOpenReview("under-review")).toBe(true);
    expect(isOpenReview("resolved")).toBe(false);
    expect(passageBy("PROT-AETHER-01", "v3.0", "visits").text).toContain("8 clinic visits");
    expect(passageBy(consentDoc.id, consentDoc.version, "procedures").text).toContain("6 times");
  });

  it("passes the full check list", () => {
    expect(runChecks().filter((check) => !check.passed)).toEqual([]);
  });
});
