import type { ScanReport } from "../core/types.js";

export function renderHumanSummary(report: ScanReport): string {
  const categories = [
    ...new Set(report.processingActivities.flatMap((activity) => activity.personalData.map((data) => data.field || data.category)))
  ];
  const highPriorityRisks = report.findings
    .slice()
    .sort((a, b) => riskWeight(b.severity) - riskWeight(a.severity))
    .slice(0, 5);
  const checkLines = Object.entries(report.complianceChecks)
    .filter(([, check]) => check.status !== "pass")
    .map(([key, check]) => `[${check.status.toUpperCase()}] ${labelCheck(key)} - ${check.reason}`);

  return `${[
    "code2pia scan complete",
    "",
    `Jurisdiction: ${report.jurisdiction.country} / ${report.jurisdiction.law}`,
    `Risk score: ${report.summary.overallRisk.toUpperCase()}`,
    `PIA/EIPD trigger: ${report.summary.requiresPIA}`,
    "",
    `Files scanned: ${report.scan.filesScanned}`,
    `Processing activities: ${report.processingActivities.length}`,
    `Personal data: ${categories.length > 0 ? categories.join(", ") : "none detected"}`,
    `Findings: ${report.findings.length}`,
    `Data flows: ${report.dataFlows.length}`,
    "",
    highPriorityRisks.length > 0 ? "Top risks:" : "Top risks: none detected",
    ...highPriorityRisks.map((risk) => `[${risk.severity.toUpperCase()}] ${risk.title} - ${risk.recommendation}`),
    "",
    "Compliance checks:",
    ...(checkLines.length > 0 ? checkLines : ["No failing, warning, or unknown checks detected by the current heuristics."]),
    "",
    report.summary.mainReasons.length > 0 ? "Main reasons:" : undefined,
    ...report.summary.mainReasons.map((reason) => `- ${reason}`),
    "",
    report.disclaimer
  ]
    .filter((line) => line !== undefined)
    .join("\n")}\n`;
}

function riskWeight(level: string): number {
  return level === "high" ? 3 : level === "medium" ? 2 : 1;
}

function labelCheck(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}
