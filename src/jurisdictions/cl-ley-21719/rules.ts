import type { PrivacyDeclaration } from "../../declarations/schema.js";
import type { ScanResult } from "../../core/scan/types.js";
import type { JurisdictionAssessment } from "../types.js";
import { principlesForFinding, sensitiveCategories } from "./mappings.js";

export function evaluateChile21719(scanResult: ScanResult, declaration?: PrivacyDeclaration): JurisdictionAssessment {
  const hasPersonalData = scanResult.personalData.length > 0;
  const hasSensitiveData = scanResult.personalData.some((item) => sensitiveCategories.has(item.category));
  const hasExternalRecipient = scanResult.dataFlows.some((flow) => flow.externalRecipient);
  const hasDeclaration = Boolean(declaration);

  return {
    jurisdiction: "CL-LEY-21719",
    lawName: "Ley 21.719",
    summary: "Chile-first assessment generated from detected evidence and optional privacy declaration.",
    mappedFindings: scanResult.findings.map((finding) => ({
      findingId: finding.id,
      principles: principlesForFinding(finding.type),
      lawReference: "Ley 21.719",
      reviewRequired: true
    })),
    complianceChecks: {
      purpose: {
        status: !hasPersonalData ? "pass" : declaration?.processingActivities.some((activity) => activity.purpose) ? "warning" : "fail",
        reason: hasDeclaration ? "Declaration evidence found; human review required." : "No declaration purpose evidence found."
      },
      lawfulBasis: {
        status: !hasPersonalData ? "pass" : declaration?.processingActivities.some((activity) => activity.lawfulBasis) ? "warning" : "fail",
        reason: hasDeclaration ? "Declaration lawful-basis evidence found; human review required." : "No lawful basis evidence found."
      },
      retention: {
        status: !hasPersonalData ? "pass" : declaration?.processingActivities.some((activity) => activity.retention) ? "warning" : "fail",
        reason: hasDeclaration ? "Declaration retention evidence found; human review required." : "No retention evidence found."
      },
      sensitiveData: {
        status: hasSensitiveData ? "warning" : "pass",
        reason: hasSensitiveData ? "Ley 21.719 sensitive data detected." : "No sensitive data category detected."
      },
      processors: {
        status: hasExternalRecipient && !declaration?.processingActivities.some((activity) => activity.processors.length || activity.recipients.length) ? "warning" : "pass",
        reason: hasExternalRecipient ? "External recipient detected; verify processor/recipient declaration." : "No external recipient detected."
      }
    }
  };
}
