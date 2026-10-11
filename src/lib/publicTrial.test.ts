import { describe, expect, it } from "vitest";
import { coverageScore } from "./protocolCheck";
import {
  amendmentHistory,
  changeImpact,
  consistencyRows,
  peerComparison,
  protocolBody,
  protocolMeta,
  protocolSections,
  runTrialPlants,
  runWritePlants,
  scheduleVisits,
  cleanPages,
  trialBlocks,
  trialBurden,
  trialChanges,
  trialChecklist,
  trialChecks,
  trialHotspots,
} from "./publicTrial";
import { fixtureTrial } from "./trialFixture";

describe("NCT03238781 snapshot", () => {
  const trial = fixtureTrial();

  it("is the AMG 301 migraine study with protocol and SAP text", () => {
    expect(trial.study.protocolSection.identificationModule.nctId).toBe("NCT03238781");
    expect(protocolBody(trial.protocol).length).toBe(111);
    expect(trial.sap.pages.length).toBe(82);
    expect(protocolMeta(trial.protocol)).toMatchObject({ version: "Amendment 2", date: "17 October 2017" });
  });

  it("runs the M11 + SPIRIT checklist with page references", () => {
    const rows = trialChecklist(trial);
    const score = coverageScore(rows);
    expect(protocolSections(trial).length).toBeGreaterThan(50);
    expect(score.present).toBeGreaterThan(score.missing);
    expect(rows.find((row) => row.id === "m11-1.3")?.where).toMatch(/p\. \d+/);
  });

  it("reads the schedule of activities", () => {
    const schedule = scheduleVisits(cleanPages(protocolBody(trial.protocol)));
    expect(schedule.visits.map((visit) => visit.week)).toEqual([null, -4, 0, 1, 2, 4, 6, 8, 9, 10, 12, 16, 20, 24, 28]);
  });

  it("finds no false flags in the posted protocol and catches every planted error", () => {
    const checks = trialChecks(protocolBody(trial.protocol), trial.sap.pages, trial.study);
    expect(checks.filter((item) => item.status === "flag")).toEqual([]);
    expect(checks.filter((item) => item.status === "cannot-check")).toEqual([]);
    const plants = runTrialPlants(trial);
    expect(plants.caught).toBe(plants.planted);
    expect(plants.falseAlarms).toBe(0);
  });

  it("reads the real amendment history", () => {
    const history = amendmentHistory(trial.protocol);
    expect(history.map((item) => item.name)).toEqual(["Amendment 2", "Amendment 1"]);
    expect(history[0].changes.some((change) => change.category === "Eligibility")).toBe(true);
    expect(history[0].changes.some((change) => change.category === "Visit schedule")).toBe(true);
  });

  it("compares burden and eligibility with similar trials", () => {
    const burden = trialBurden(trial);
    expect(burden.visits.length).toBe(15);
    const peers = peerComparison(trial);
    expect(peers.count).toBe(trial.peers.length);
    const hot = trialHotspots(trial, trialChecks(protocolBody(trial.protocol), trial.sap.pages, trial.study), trialChecklist(trial));
    expect(hot.some((item) => item.id === "eligibility-age")).toBe(true);
  });

  it("finds the real QM / Q4W wording difference and catches planted inconsistencies", () => {
    const rows = consistencyRows(protocolBody(trial.protocol), trial.sap.pages, trial.study);
    const status = Object.fromEntries(rows.map((row) => [row.id, row.status]));
    expect(status).toMatchObject({ "sample-size": "explained", "low-dose": "differs", "high-dose": "same", period: "same", "follow-up": "explained", age: "partial", endpoint: "same" });
    const plants = runWritePlants(trial);
    expect(plants.caught).toBe(plants.planted);
    expect(plants.falseAlarms).toBe(0);
  });

  it("binds blocks to the real values and lists every affected place for the week-36 change", () => {
    const values = Object.fromEntries(trialBlocks(trial).map((block) => [block.id, block.value]));
    expect(values).toMatchObject({ sample_size: "335", ratio: "4:3:3", treatment_weeks: "12", followup_weeks: "16", age_min: "18", age_max: "60" });
    const impact = changeImpact(trial, trialChanges[0]);
    expect(impact.some((line) => line.document === "Protocol" && line.kind === "source")).toBe(true);
    expect(impact.some((line) => line.document === "SAP")).toBe(true);
    expect(impact.find((line) => line.id === "assembled-consent-plain")?.after).toContain("week 36");
  });
});
