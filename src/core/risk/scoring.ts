import type { Finding, PersonalDataDetection } from "../scan/types.js";
import type { RiskLevel } from "../types.js";

export function scoreRisk(personalData: PersonalDataDetection[], findings: Finding[]): RiskLevel {
  let score = 0;

  for (const item of personalData) {
    score += item.sensitivity === "high" ? 3 : item.sensitivity === "medium" ? 2 : 1;
  }

  for (const finding of findings) {
    score += finding.severity === "high" ? 5 : finding.severity === "medium" ? 3 : 1;
  }

  if (score >= 12) return "high";
  if (score >= 5) return "medium";
  return "low";
}
