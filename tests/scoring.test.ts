import { describe, expect, it } from "vitest";
import { calculateRiskScore } from "../src/core/scoring.js";
import type { PersonalDataFinding, RiskFinding } from "../src/core/types.js";

const location = { file: "/repo/user.ts", line: 1, column: 0 };

describe("calculateRiskScore", () => {
  it("scores high when sensitive data and high exposure risks are present", () => {
    const personalData: PersonalDataFinding[] = [
      {
        category: "health",
        identifier: "healthCondition",
        confidence: 0.9,
        sensitivity: "high",
        evidence: "healthCondition: string",
        location
      }
    ];
    const risks: RiskFinding[] = [
      {
        id: "logging-personal-data",
        title: "Logging personal data",
        description: "test",
        level: "high",
        evidence: "console.log(user.healthCondition)",
        recommendation: "Redact logs.",
        location,
        relatedData: ["health"]
      }
    ];

    expect(calculateRiskScore(personalData, risks, ["Document retention."])).toBe("medium");
    expect(calculateRiskScore(personalData, risks, ["Document retention.", "Document purpose.", "Document lawful basis.", "Document access."])).toBe(
      "high"
    );
  });
});
