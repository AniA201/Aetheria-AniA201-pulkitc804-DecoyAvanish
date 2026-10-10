import { describe, expect, it } from "vitest";
import {
  annexV,
  audienceDrafts,
  checklist,
  checklistCounts,
  importsProtocolFigures,
  keepsConsentFigures,
  proposeVisitCount,
  readingEase,
  versionStanding,
} from "./workbook";

describe("workbook", () => {
  it("leaves the version unverified until a person enters a list", () => {
    expect(versionStanding("v2.1", [])).toBe("unverified");
    expect(versionStanding("v2.1", ["v2.1"])).toBe("listed");
    expect(versionStanding("v2.0", ["v2.1"])).toBe("not-listed");
  });

  it("drafts a visit change without treating it as the source", () => {
    const lines = proposeVisitCount("7");
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.every((line) => line.after.includes("7"))).toBe(true);
    expect(lines[0].before).not.toBe(lines[0].after);
  });

  it("keeps consent figures in both audience drafts", () => {
    expect(keepsConsentFigures(audienceDrafts.adult)).toBe(true);
    expect(keepsConsentFigures(audienceDrafts.caregiver)).toBe(true);
    expect(importsProtocolFigures(audienceDrafts.adult)).toBe(false);
    expect(importsProtocolFigures(audienceDrafts.caregiver)).toBe(false);
  });

  it("marks missing protocol sections and leaves Annex V empty of results", () => {
    const counts = checklistCounts(checklist);
    expect(counts.missing).toBeGreaterThan(0);
    expect(annexV).toHaveLength(10);
    expect(annexV.every((row) => row.state.startsWith("No results"))).toBe(true);
  });

  it("describes sentence length as a formula, not a reader test", () => {
    const ease = readingEase("You come 6 times. You receive $50.");
    expect(ease.wordsPerSentence).toBeGreaterThan(0);
    expect(ease.label.length).toBeGreaterThan(0);
  });
});
