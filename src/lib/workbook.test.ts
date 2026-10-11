import { describe, expect, it } from "vitest";
import { facts, personaFixtures, plainDraft, teachPrompts } from "../data/study";
import { adultSeed, extractValues, proposeChange, registryFields, render, sourceText, uses } from "./blocks";
import { draftFromBrief, practiceBrief, usdmShape } from "./brief";
import { loadDemoConsent } from "./consent";
import { consentElements } from "./elements";
import { checkDraft, readability, runPlantedDrafts, toCaregiver, traceFigures } from "./plainLab";
import {
  checklistItems,
  coverageScore,
  crossChecks,
  internalChecks,
  practiceProtocol,
  runChecklist,
  runPlantedCases,
  sectionsFromText,
} from "./protocolCheck";
import { assessTeachback } from "./teachback";
import { annexV, readingSource, versionStanding } from "./workbook";

describe("version standing", () => {
  it("stays unverified until a person enters a list", () => {
    expect(versionStanding("v2.1", [])).toBe("unverified");
    expect(versionStanding("v2.1", ["v2.1"])).toBe("listed");
    expect(versionStanding("v2.0", ["v2.1"])).toBe("not-listed");
  });
});

describe("write once blocks", () => {
  const values = extractValues();

  it("reads every value from the stored files and matches the shared facts", () => {
    expect(values.visits).toEqual({ protocol: "8", consent: "6" });
    expect(values.duration).toEqual({ protocol: "24", consent: "16" });
    expect(values.pay).toEqual({ protocol: "80", consent: "50" });
    expect(values.blood).toEqual({ protocol: "2", consent: "2" });
    expect(values.retention).toEqual({ protocol: "15", consent: "15" });
    for (const fact of facts) {
      const value = values[fact.id as keyof typeof values];
      expect(fact.protocolValue, fact.id).toContain(value.protocol);
      expect(fact.consentValue, fact.id).toContain(value.consent);
    }
  });

  it("rebuilds each source sentence exactly from its template", () => {
    for (const use of uses) {
      const stored = sourceText(use);
      if (stored === null) continue;
      expect(stored).toContain(render(use.template, use.side, values));
    }
    expect(adultSeed(values)).toBe(plainDraft.draft);
  });

  it("proposes any value for any block and lists every sentence with its owner", () => {
    const lines = proposeChange("pay", "65", values);
    expect(lines.map((line) => line.id)).toEqual(["protocol-pay", "consent-pay", "plain-adult", "registry-pay"]);
    expect(lines.every((line) => line.owner)).toBe(true);
    expect(lines.find((line) => line.id === "consent-pay")?.after).toContain("$65");
    expect(lines.find((line) => line.id === "registry-pay")?.after).toBe("Visit payment: $65");
  });

  it("writes the registry line without the old bug and warns about visit numbers", () => {
    const lines = proposeChange("visits", "7", values);
    expect(lines.find((line) => line.id === "registry-visits")?.after).toBe("Clinic visits: 7 visits");
    expect(lines.find((line) => line.id === "registry-visits")?.before).toBe("Clinic visits: Protocol 8 visits · Consent 6 visits");
    const short = proposeChange("visits", "5", values).find((line) => line.id === "consent-blood");
    expect(short?.warnings[0]).toMatch(/visit 6/);
    expect(registryFields(values).find((field) => field.id === "blood")?.agrees).toBe(true);
  });
});

describe("pre-flight protocol check", () => {
  const { sections, meta } = practiceProtocol();
  const rows = runChecklist(sections, meta);

  it("covers all 34 SPIRIT 2025 items and the M11 headings", () => {
    expect(checklistItems.filter((item) => item.list === "SPIRIT 2025")).toHaveLength(34);
    expect(rows).toHaveLength(checklistItems.length);
    expect(rows.find((row) => row.id === "spirit-2")?.mark).toBe("present");
  });

  it("computes the score from the marks with the formula shown on screen", () => {
    const score = coverageScore(rows);
    expect(score.present + score.thin + score.missing).toBe(score.total);
    expect(score.value).toBe(Math.round(((score.present + score.thin / 2) / score.total) * 100));
    expect(score.value).toBeLessThan(50);
  });

  it("finds the three real disagreements and nothing else in the practice pair", () => {
    const flagged = [...internalChecks(sections), ...crossChecks()].filter((item) => item.status === "flag").map((item) => item.id);
    expect(flagged.sort()).toEqual(["cross-duration", "cross-pay", "cross-visits"]);
  });

  it("catches every planted error without false alarms", () => {
    const result = runPlantedCases();
    expect(result.caught).toBe(result.planted);
    expect(result.falseAlarms).toBe(0);
  });

  it("splits uploaded text at headings", () => {
    const split = sectionsFromText([{ number: 1, text: "1 PROTOCOL SUMMARY\nA short synopsis.\n5.2 Inclusion Criteria\nAdults with migraine." }], "x.pdf");
    expect(split.map((section) => section.heading)).toEqual(["1 PROTOCOL SUMMARY", "5.2 Inclusion Criteria"]);
    expect(runChecklist(split).find((row) => row.id === "m11-5.2")?.mark).not.toBe("missing");
  });
});

describe("design brief", () => {
  it("drafts only from what the brief says", () => {
    const sections = draftFromBrief(practiceBrief);
    expect(sections.find((section) => section.ref === "1.3")?.text).toContain("8 clinic visits");
    expect(sections.find((section) => section.ref === "5.2")?.missing).toBe(true);
    expect(sections.find((section) => section.ref === "10.11")?.missing).toBe(true);
    const late = draftFromBrief({ ...practiceBrief, primaryEndpoint: "Change in monthly migraine days", endpointWeek: "28" });
    expect(late.find((section) => section.ref === "3.1")?.text).toMatch(/after the last visit/);
    const json = usdmShape(practiceBrief, new Set());
    expect(json.note).toMatch(/Not validated/);
    expect(json.study.versions[0].studyDesigns[0].encounters).toHaveLength(8);
  });
});

describe("say it plainly", () => {
  const source = readingSource(loadDemoConsent());

  it("keeps the consent figures for both readers", () => {
    expect(source.mustKeep).toEqual(["6 times", "16 weeks", "$50"]);
    expect(source.mustNotAdd).toEqual(["8 visits", "24 weeks", "$80"]);
    for (const text of [source.adult, source.caregiver]) {
      expect(checkDraft(text, source).every((check) => check.passed)).toBe(true);
    }
    expect(toCaregiver(source.adult)).toMatch(/^The person in the study comes/);
  });

  it("computes Flesch scores from the formula", () => {
    const easy = readability("The cat sat. The dog ran.");
    expect(easy.readingEase).toBeGreaterThan(90);
    expect(readability(source.original).readingEase).toBeLessThan(easy.readingEase);
  });

  it("catches every planted draft error and passes the faithful control", () => {
    const lab = runPlantedDrafts();
    expect(lab.caught).toBe(lab.planted);
    expect(lab.planted).toBe(5);
    expect(lab.falseAlarms).toBe(0);
  });

  it("traces each figure to the passage that holds it", () => {
    const trace = traceFigures(source.adult, source.passages);
    expect(trace.find((item) => item.figure === "$50")?.citation).toMatch(/7\.1|Costs/i);
    expect(trace.find((item) => item.figure === "6 times")?.citation).toMatch(/4\.1|Procedures/i);
  });

  it("leaves the results summary empty for a study with no results", () => {
    expect(annexV).toHaveLength(10);
  });
});

describe("consent elements", () => {
  it("reports what the sample form has and lacks", () => {
    const rows = Object.fromEntries(consentElements(loadDemoConsent().passages).map((row) => [row.id, row.mark]));
    expect(rows.a2).toBe("present");
    expect(rows.a8).toBe("present");
    expect(rows.a4).toBe("missing");
    expect(rows.a6).toBe("missing");
    expect(rows.a5).toBe("thin");
  });
});

describe("teach-back personas", () => {
  it("gives every starter-sheet persona the expected result", () => {
    for (const persona of personaFixtures) {
      const result = assessTeachback(persona.promptId, persona.response, teachPrompts, persona.speaker);
      expect(result.label, persona.persona).toBe(persona.expect);
    }
  });

  it("has a question for every section of the sample form", () => {
    expect(new Set(teachPrompts.map((prompt) => prompt.sectionId))).toEqual(new Set(["procedures", "risks", "rights", "costs", "privacy"]));
  });

  it("does not flag a negated misunderstanding", () => {
    const result = assessTeachback("risk", "It may cause nausea, it is not completely safe, and it may not help.");
    expect(result.misconception).toBeUndefined();
  });
});
