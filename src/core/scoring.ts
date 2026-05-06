import type { PersonalDataFinding, RiskFinding, RiskLevel } from "./types.js";

export function calculateRiskScore(personalData: PersonalDataFinding[], risks: RiskFinding[], missingEvidence: string[]): RiskLevel {
  let score = 0;

  const uniquePersonalData = new Map<string, PersonalDataFinding>();
  for (const finding of personalData) {
    uniquePersonalData.set(`${finding.category}:${finding.identifier}`, finding);
  }

  for (const finding of uniquePersonalData.values()) {
    score += finding.sensitivity === "high" ? 3 : finding.sensitivity === "medium" ? 2 : 1;
  }

  for (const risk of risks) {
    score += risk.level === "high" ? 5 : risk.level === "medium" ? 3 : 1;
  }

  score += Math.min(missingEvidence.length, 4);

  if (score >= 12) {
    return "high";
  }

  if (score >= 5) {
    return "medium";
  }

  return "low";
}
