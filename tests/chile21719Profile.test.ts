import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/core/scanner.js";

describe("chile-21719 profile", () => {
  it("maps high-risk sample findings to Chile Law 21.719 compliance topics and EIPD triggers", async () => {
    const report = await scanRepository("examples/high-app", { profile: "chile-21719" });

    expect(report.schemaVersion).toBe("0.1.0");
    expect(report.jurisdiction).toMatchObject({ country: "CL", law: "Ley 21.719", mode: "draft_pia" });
    expect(report.summary.requiresPIA).toBe("likely");
    expect(report.complianceChecks.sensitiveData.status).toBe("fail");
    expect(report.complianceChecks.thirdParties.status).toBe("warning");
    expect(report.findings.map((finding) => finding.type)).toEqual(expect.arrayContaining(["logging_personal_data", "external_api_transfer"]));
    expect(report.processingActivities[0]?.personalData.map((data) => data.field)).toEqual(expect.arrayContaining(["rut", "email", "healthCondition"]));
  });
});
