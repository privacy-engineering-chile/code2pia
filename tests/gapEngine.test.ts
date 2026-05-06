import { describe, expect, it } from "vitest";
import { runCode2PiaScan } from "../src/core/scan/engine.js";

describe("gap detection", () => {
  it("detects undeclared personal data when declaration evidence is incomplete", async () => {
    const report = await runCode2PiaScan("examples/high-app", { jurisdiction: "CL-LEY-21719" });

    expect(report.gaps.map((gap) => gap.type)).toEqual(expect.arrayContaining(["purpose_missing", "lawful_basis_missing", "retention_missing"]));
    expect(report.remediationCases.length).toBeGreaterThan(0);
  });
});
