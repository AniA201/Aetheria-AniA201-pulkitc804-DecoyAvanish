import { describe, expect, it } from "vitest";
import { annexElements, checkLay, layAudiences, layFacts, laySummary, layText, runLayPlants, traceNumbers } from "./laySummary";
import { readability } from "./plainLab";
import { fixtureTrial } from "./trialFixture";

describe("Annex V lay summary from NCT03238781 results", () => {
  const trial = fixtureTrial();
  const facts = layFacts(trial.study, trial.retrieved);

  it("reads the posted results", () => {
    const value = (id: string) => facts.find((fact) => fact.id === id)?.value;
    expect([value("started-placebo"), value("started-low"), value("started-high"), value("total")]).toEqual(["137", "104", "102", "343"]);
    expect([value("mmd-placebo"), value("mmd-low"), value("mmd-high")]).toEqual(["-2.45", "-2.20", "-2.19"]);
    expect(value("sae-terms")).toContain("Hypersensitivity");
  });

  it("writes every audience version from the same facts, and each passes every check", () => {
    for (const audience of layAudiences) {
      const sections = laySummary(facts, audience.id);
      expect(sections).toHaveLength(10);
      const text = layText(sections);
      expect(text).not.toContain("[not in the record]");
      const failed = checkLay(text, facts).filter((check) => !check.passed);
      expect(failed, `${audience.id}: ${failed.map((check) => check.note).join(" ")}`).toEqual([]);
    }
  });

  it("covers all ten Annex V headings for every audience", () => {
    const facts = layFacts(fixtureTrial().study, fixtureTrial().retrieved);
    for (const audience of layAudiences) {
      expect(new Set(laySummary(facts, audience.id).map((section) => section.id)), audience.id).toEqual(new Set(annexElements.map((item) => item.id)));
    }
  });

  it("traces every number to a registry field", () => {
    const text = layText(laySummary(facts, "lay-adult"));
    expect(traceNumbers(text, facts).every((item) => item.facts.length > 0)).toBe(true);
  });

  it("is easier to read for the adult reader than for the physician", () => {
    const adult = readability(layText(laySummary(facts, "lay-adult")));
    const doctor = readability(layText(laySummary(facts, "lay-physician")));
    expect(adult.readingEase).toBeGreaterThan(doctor.readingEase);
  });

  it("catches each planted error with no false alarm on the control", () => {
    const lab = runLayPlants(facts);
    expect(lab.caught).toBe(lab.planted);
    expect(lab.falseAlarms).toBe(0);
  });

  it("regenerates with a corrected source value", () => {
    const corrected = layFacts(trial.study, trial.retrieved, {
      path: "resultsSection.participantFlowModule.periods[0].milestones[COMPLETED].FG000",
      label: "Completed (placebo)",
      from: "111",
      to: "112",
    });
    expect(layText(laySummary(corrected, "lay-adult"))).toContain("281 of 343 people finished");
  });
});
