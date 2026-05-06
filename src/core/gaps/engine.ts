import type { PrivacyDeclaration } from "../../declarations/schema.js";
import type { Gap, RemediationCase } from "../../jurisdictions/types.js";
import type { ScanResult } from "../scan/types.js";

const sensitiveCategories = new Set([
  "health",
  "biometric",
  "genetic",
  "ethnicRace",
  "politicalAffiliation",
  "unionAffiliation",
  "socioeconomic",
  "ideologyBelief",
  "religion",
  "sexualLife",
  "sexualOrientation",
  "genderIdentity"
]);

export function detectGaps(scanResult: ScanResult, declaration?: PrivacyDeclaration): { gaps: Gap[]; remediationCases: RemediationCase[] } {
  const gaps: Gap[] = [];
  const declaredFields = new Set(declaration?.processingActivities.flatMap((activity) => activity.personalData) ?? []);
  const detectedFields = new Set(scanResult.personalData.map((item) => item.field));
  const declaredProcessors = new Set(declaration?.processingActivities.flatMap((activity) => [...activity.processors, ...activity.recipients]) ?? []);
  const hasExternalRecipient = scanResult.dataFlows.some((flow) => flow.externalRecipient);
  const hasSensitiveData = scanResult.personalData.some((item) => sensitiveCategories.has(item.category));
  const hasLoggingRisk = scanResult.findings.some((finding) => finding.type === "personal_data_in_logs");
  const declaredLogRedaction = declaration?.processingActivities.some((activity) =>
    activity.securityMeasures.some((measure) => /log.*(redact|mask)|redact.*log|mask.*log/i.test(measure))
  );

  for (const field of detectedFields) {
    if (!declaredFields.has(field)) {
      gaps.push(gap("personal_data_not_declared", "high", `Personal data detected but not declared: ${field}`));
    }
  }

  for (const field of declaredFields) {
    if (!detectedFields.has(field)) {
      gaps.push(gap("declared_data_not_detected", "low", `Declared personal data was not detected in code: ${field}`));
    }
  }

  for (const activity of declaration?.processingActivities ?? []) {
    if (!activity.purpose) gaps.push(gap("purpose_missing", "high", `Purpose missing for activity ${activity.id}.`));
    if (!activity.lawfulBasis) gaps.push(gap("lawful_basis_missing", "high", `Lawful basis missing for activity ${activity.id}.`));
    if (!activity.retention) gaps.push(gap("retention_missing", "medium", `Retention missing for activity ${activity.id}.`));
  }

  if (!declaration && scanResult.personalData.length > 0) {
    gaps.push(gap("purpose_missing", "high", "No privacy declaration found for detected personal data."));
    gaps.push(gap("lawful_basis_missing", "high", "No lawful basis declaration found for detected personal data."));
    gaps.push(gap("retention_missing", "medium", "No retention declaration found for detected personal data."));
  }

  if (hasExternalRecipient && declaredProcessors.size === 0) {
    gaps.push(gap("processor_not_declared", "medium", "External recipient detected but no processor or recipient was declared."));
  }

  if (scanResult.dataFlows.some((flow) => flow.internationalTransfer === "unknown")) {
    gaps.push(gap("international_transfer_unknown", "medium", "International transfer status is unknown for at least one external flow."));
  }

  if (hasSensitiveData && !declaration?.processingActivities.some((activity) => activity.dpia.assessed)) {
    gaps.push(gap("sensitive_data_without_dpia", "high", "Sensitive or high-sensitivity data detected without declared DPIA assessment."));
  }

  if (declaredLogRedaction && hasLoggingRisk) {
    gaps.push(gap("declared_log_redaction_but_logging_detected", "high", "Declared log redaction conflicts with detected personal-data logging."));
  }

  return {
    gaps,
    remediationCases: gaps.map((item, index) => ({
      id: `remediation_${String(index + 1).padStart(3, "0")}`,
      priority: item.severity,
      title: item.title,
      recommendation: recommendationForGap(item.type)
    }))
  };
}

function gap(type: string, severity: Gap["severity"], title: string): Gap {
  return { id: `gap_${type}`, type, severity, title };
}

function recommendationForGap(type: string): string {
  const recommendations: Record<string, string> = {
    personal_data_not_declared: "Add the field to code2pia.privacy.yaml or remove it from processing.",
    declared_data_not_detected: "Confirm whether the declaration is stale or the scanner needs framework-specific support.",
    purpose_missing: "Declare a specific processing purpose.",
    lawful_basis_missing: "Declare the lawful basis for the activity.",
    retention_missing: "Declare retention and deletion criteria.",
    processor_not_declared: "Declare processors, recipients, contracts, and transfer safeguards.",
    international_transfer_unknown: "Assess whether the recipient involves international transfer.",
    sensitive_data_without_dpia: "Complete or document DPIA/EIPD assessment.",
    declared_log_redaction_but_logging_detected: "Remove personal data from logs or update controls."
  };
  return recommendations[type] ?? "Review and remediate the gap.";
}
