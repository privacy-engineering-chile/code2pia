import type { Code2PiaReport } from "../../core/scan/engine.js";
import type { DpiaDraft } from "../../jurisdictions/types.js";

export function renderPiaMarkdown(report: Code2PiaReport): string {
  const personalData = report.scanResult.personalData.map((item) => `- ${item.field} (${item.category}, ${item.sensitivity})`).join("\n");
  const gaps = report.gaps.map((gap) => `- [${gap.severity}] ${gap.title}`).join("\n");
  const controls = report.remediationCases.map((item) => `- [${item.priority}] ${item.recommendation}`).join("\n");

  return `# Privacy Impact Assessment Draft

> ${report.disclaimer}

Repository: \`${report.scan.repository}\`

Jurisdiction: ${report.jurisdictionAssessment.jurisdiction} / ${report.jurisdictionAssessment.lawName}

## 1. Executive Summary

Risk level: **${report.scanResult.risk.toUpperCase()}**

DPIA / EIPD trigger: **${String(report.dpiaTriggerAssessment.required).toUpperCase()}** (${report.dpiaTriggerAssessment.confidence})

## 2. Personal Data Detected

${personalData || "- No personal data detected."}

## 3. Data Flows

${report.scanResult.dataFlows.map((flow) => `- ${flow.from} -> ${flow.to} (${flow.data.join(", ") || "unknown"})`).join("\n") || "- No data flows inferred."}

## 4. Chilean Law 21.719 Assessment

${Object.entries(report.jurisdictionAssessment.complianceChecks)
  .map(([key, check]) => `- ${key}: ${check.status} - ${check.reason}`)
  .join("\n")}

## 5. Articulo 15 ter Trigger Assessment

Reference: ${report.dpiaTriggerAssessment.lawReference}

${report.dpiaTriggerAssessment.triggers.map((trigger) => `- ${trigger.id}: ${trigger.present} - ${trigger.reason}`).join("\n")}

Recommendation: ${report.dpiaTriggerAssessment.recommendation}

## 6. Gaps

${gaps || "- No gaps detected."}

## 7. Recommended Controls

${controls || "- No remediation cases generated."}

## 8. Human Review Checklist

- Confirm purpose and lawful basis.
- Confirm proportionality and minimization.
- Confirm retention and deletion workflow.
- Confirm processors, recipients and international transfers.
- Confirm security measures and data subject rights workflows.
`;
}

export function renderDpiaMarkdown(dpia: DpiaDraft): string {
  return `# DPIA / EIPD Draft

Jurisdiction: ${dpia.jurisdiction} / ${dpia.lawName}

## Articulo 15 ter Trigger Assessment

Required: ${String(dpia.triggerAssessment.required)}

Confidence: ${dpia.triggerAssessment.confidence}

Law reference: ${dpia.triggerAssessment.lawReference}

${dpia.triggerAssessment.triggers.map((trigger) => `- ${trigger.id}: ${trigger.present} - ${trigger.reason}`).join("\n")}

## Processing Summary

${dpia.processingSummary}

## Risks

${dpia.risks.map((risk) => `- [${risk.severity}] ${risk.title}: ${risk.description}`).join("\n") || "- No risks detected."}

## Recommended Controls

${dpia.recommendedControls.map((control) => `- ${control}`).join("\n")}

## Human Review Checklist

${dpia.humanReviewChecklist.map((item) => `- ${item}`).join("\n")}
`;
}
