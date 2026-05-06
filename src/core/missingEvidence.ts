import type { PersonalDataFinding, RiskFinding } from "./types.js";

export function inferMissingEvidence(personalData: PersonalDataFinding[], risks: RiskFinding[]): string[] {
  const missing = new Set<string>();
  const hasMissingPurposeRisk = risks.some((risk) => risk.id === "missing-purpose-definition");
  const hasMissingRetentionRisk = risks.some((risk) => risk.id === "missing-retention-definition");

  if (personalData.length > 0) {
    missing.add("Document lawful basis or legal/privacy justification for processing.");
  }

  if (hasMissingPurposeRisk) {
    missing.add("Document processing purposes for each detected personal data category.");
  }

  if (hasMissingRetentionRisk) {
    missing.add("Document retention periods and deletion criteria.");
  }

  if (risks.some((risk) => risk.id.includes("external-api"))) {
    missing.add("Document vendor/subprocessor review and data transfer safeguards.");
  }

  if (risks.some((risk) => risk.id.includes("analytics"))) {
    missing.add("Document analytics consent, opt-out behavior, and minimization controls.");
  }

  if (risks.some((risk) => risk.id.includes("logging"))) {
    missing.add("Document logging redaction, access controls, and log retention.");
  }

  return [...missing];
}
