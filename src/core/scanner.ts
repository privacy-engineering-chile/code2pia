import path from "node:path";
import { collectSourceFiles } from "./source.js";
import { calculateRiskScore } from "./scoring.js";
import { inferMissingEvidence } from "./missingEvidence.js";
import { ScanReportSchema, type Detector, type ScanReport } from "./types.js";
import { buildEvidenceReport } from "./reportBuilder.js";
import { findActivityReference, loadEvidenceFile, type EvidenceFile } from "./evidence.js";
import { personalDataDetector } from "../detectors/personalDataDetector.js";
import { riskPatternDetector } from "../detectors/riskPatternDetector.js";
import { dataFlowDetector } from "../detectors/dataFlowDetector.js";
import type { LawProfile, RiskFinding } from "./types.js";

export const DEFAULT_DISCLAIMER =
  "This is an automatically generated PIA draft and must be reviewed by legal, privacy, security and architecture teams.";

export interface ScanOptions {
  detectors?: Detector[];
  profile?: LawProfile;
  evidencePath?: string;
}

export async function scanRepository(targetPath: string, options: ScanOptions = {}): Promise<ScanReport> {
  const startedAt = new Date().toISOString();
  const rootPath = path.resolve(targetPath);
  const files = await collectSourceFiles(rootPath);
  const evidence = await loadEvidenceFile(rootPath, options.evidencePath);
  const activityReference = findActivityReference(files);
  const detectors = options.detectors ?? [personalDataDetector, riskPatternDetector, dataFlowDetector];
  const profile = options.profile ?? "generic";
  const context = { rootPath, files };

  const personalData = [];
  const risks = [];
  const dataFlows = [];

  for (const detector of detectors) {
    const result = detector.run(context);
    personalData.push(...(result.personalData ?? []));
    risks.push(...(result.risks ?? []));
    dataFlows.push(...(result.dataFlows ?? []));
  }

  const effectiveRisks = suppressEvidenceBackedRisks(risks, evidence, activityReference?.key);
  const missingEvidence = inferMissingEvidence(personalData, effectiveRisks);
  const riskScore = calculateRiskScore(personalData, effectiveRisks, missingEvidence);

  return ScanReportSchema.parse(
    buildEvidenceReport({
      rootPath,
      files,
      profile,
      startedAt,
      evidence,
      evidencePath: options.evidencePath,
      activityReference,
      personalData,
      risks: effectiveRisks,
      dataFlows,
      missingEvidence,
      overallRisk: riskScore,
      disclaimer: DEFAULT_DISCLAIMER
    })
  );
}

function suppressEvidenceBackedRisks(risks: RiskFinding[], evidence: EvidenceFile | undefined, activityKey: string | undefined): RiskFinding[] {
  const activity = activityKey ? evidence?.activities[activityKey] : undefined;
  if (!activity) {
    return risks;
  }

  return risks.filter((risk) => {
    if (risk.id === "missing-purpose-definition" && activity.purpose && activity.lawfulBasis) {
      return false;
    }

    if (risk.id === "missing-retention-definition" && activity.retention) {
      return false;
    }

    return true;
  });
}
