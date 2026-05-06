import { describe, expect, it } from "vitest";
import { runCode2PiaScan } from "../src/core/scan/engine.js";

describe("Chile Ley 21.719 Art. 15 ter trigger engine", () => {
  it("flags sensitive-data trigger as unknown when no DPIA assessment is declared", async () => {
    const report = await runCode2PiaScan("examples/high-app", { jurisdiction: "CL-LEY-21719" });

    expect(report.dpiaTriggerAssessment.lawReference).toBe("Ley 21.719, Art. 15 ter");
    expect(report.dpiaTriggerAssessment.triggers.map((trigger) => trigger.id)).toContain("art15ter_sensitive_exception");
    expect(report.dpiaTriggerAssessment.triggers.find((trigger) => trigger.id === "art15ter_sensitive_exception")?.present).toBe("unknown");
    expect(report.dpiaTriggerAssessment.required).toBe(true);
  });
});
