import { describe, expect, it } from "vitest";
import { runChecks } from "./checks";

describe("Aetheria demo checks", () => {
  it("passes the labeled synthetic checks", () => {
    const results = runChecks();
    const failed = results.filter((result) => !result.passed);
    expect(failed).toEqual([]);
  });
});
