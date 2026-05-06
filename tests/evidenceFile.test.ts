import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/core/scanner.js";

describe("privacy evidence files", () => {
  it("links a code activity key to external privacy evidence", async () => {
    const report = await scanRepository("examples/evidence-app", {
      profile: "chile-21719",
      evidencePath: "privacy/activities.json"
    });

    const activity = report.processingActivities[0];

    expect(activity?.activityKey).toBe("customer_registration");
    expect(activity?.purpose.status).toBe("declared");
    expect(activity?.purpose.source).toBe("privacy/activities.json#activities.customer_registration.purpose");
    expect(activity?.lawfulBasis.status).toBe("declared");
    expect(activity?.retention?.status).toBe("declared");
    expect(activity?.personalData.find((data) => data.field === "rut")?.necessity?.status).toBe("declared");
    expect(report.findings.map((finding) => finding.type)).not.toContain("missing_purpose_definition");
    expect(report.missingEvidence).not.toContain("Declared purpose");
    expect(report.complianceChecks.dataMinimization.status).toBe("pass");
  });
});
