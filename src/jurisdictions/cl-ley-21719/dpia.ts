import type { PrivacyDeclaration } from "../../declarations/schema.js";
import type { ScanResult } from "../../core/scan/types.js";
import type { DpiaDraft, DpiaTriggerAssessment } from "../types.js";
import { sensitiveCategories } from "./mappings.js";

export function evaluateArticle15Ter(scanResult: ScanResult, declaration?: PrivacyDeclaration): DpiaTriggerAssessment {
  const text = scanResult.model.files.map((file) => file.text).join("\n");
  const hasSensitiveData = scanResult.personalData.some((item) => sensitiveCategories.has(item.category));
  const hasLargeScale = scanResult.personalData.length >= 10 || /largeScale|massive|bulk|batch|millions|thousands/i.test(text);
  const hasAutomatedDecision = /profiling|profileScore|automatedDecision|creditScore|riskScore|scoring|algorithmicDecision/i.test(text);
  const hasPublicMonitoring = /publicArea|cctv|surveillance|camera|monitoring/i.test(text);
  const declaredDpia = declaration?.processingActivities.some((activity) => activity.dpia.assessed);

  const triggers = [
    {
      id: "art15ter_automated_evaluation",
      present: hasAutomatedDecision,
      reason: hasAutomatedDecision
        ? "Automated decision/profiling-like code signal detected."
        : "No automated decision/profiling signal detected."
    },
    {
      id: "art15ter_large_scale",
      present: hasLargeScale,
      reason: hasLargeScale ? "Large-scale or massive-processing signal detected." : "No large-scale processing signal detected."
    },
    {
      id: "art15ter_public_monitoring",
      present: hasPublicMonitoring,
      reason: hasPublicMonitoring ? "Public-area monitoring signal detected." : "No public-area monitoring signal detected."
    },
    {
      id: "art15ter_sensitive_exception",
      present: hasSensitiveData ? (declaredDpia ? true : "unknown") : false,
      reason: hasSensitiveData
        ? "Sensitive data detected; confirm whether processing relies on exceptions to consent."
        : "No Ley 21.719 sensitive-data category detected."
    }
  ] as DpiaTriggerAssessment["triggers"];

  const positive = triggers.some((trigger) => trigger.present === true);
  const unknown = triggers.some((trigger) => trigger.present === "unknown");

  return {
    required: positive ? true : unknown ? "unknown" : false,
    confidence: positive ? "high" : unknown ? "medium" : "medium",
    lawReference: "Ley 21.719, Art. 15 ter",
    triggers,
    recommendation: positive
      ? "Prepare and review an EIPD/DPIA before continuing processing."
      : unknown
        ? "Human review required to determine whether Art. 15 ter triggers apply."
        : "Art. 15 ter triggers were not detected by current heuristics; keep human review."
  };
}

export function generateDpiaDraft(scanResult: ScanResult, declaration?: PrivacyDeclaration): DpiaDraft {
  const triggerAssessment = evaluateArticle15Ter(scanResult, declaration);
  return {
    jurisdiction: "CL",
    lawName: "Ley 21.719",
    triggerAssessment,
    processingSummary: `Detected ${scanResult.personalData.length} personal-data indicators and ${scanResult.findings.length} risk findings.`,
    risks: scanResult.findings,
    recommendedControls: [
      "Confirm purpose, lawful basis, necessity and retention for each activity.",
      "Validate processor, recipient and international-transfer safeguards.",
      "Document data subject rights workflows.",
      "Review security measures and logging controls."
    ],
    humanReviewChecklist: [
      "Does Art. 15 ter require EIPD/DPIA?",
      "Are sensitive data exceptions to consent documented?",
      "Is processing proportionate and minimized?",
      "Are data subjects informed?",
      "Are processors and transfers governed?"
    ]
  };
}
