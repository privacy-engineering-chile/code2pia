import type { PrivacyDeclaration } from "../declarations/schema.js";
import type { Finding, ScanResult } from "../core/scan/types.js";
import type { RiskLevel } from "../core/types.js";

export interface JurisdictionAssessment {
  jurisdiction: string;
  lawName: string;
  summary: string;
  mappedFindings: Array<{
    findingId: string;
    principles: string[];
    lawReference: string;
    reviewRequired: boolean;
  }>;
  complianceChecks: Record<string, { status: "pass" | "warning" | "fail" | "unknown"; reason: string }>;
}

export interface RopaDraft {
  jurisdiction: string;
  lawName: string;
  controller?: string;
  service: string;
  activities: Array<{
    id: string;
    name: string;
    purpose?: string;
    lawfulBasis?: string;
    dataSubjects: string[];
    personalData: string[];
    sensitiveData: string[];
    retention?: string;
    processors: string[];
    recipients: string[];
    internationalTransfers: unknown[];
    securityMeasures: string[];
  }>;
}

export type ChileRatRole = "Responsable" | "Encargado" | "unknown";

export interface RatDataCategory {
  category: string;
  items: string[];
  detectedFields: string[];
  evidence: Array<{
    file: string;
    line: number;
    column?: number;
    snippet: string;
  }>;
}

export interface RatRecord {
  activityName: string;
  role: ChileRatRole;
  dataCategories: RatDataCategory[];
  dataSubjectUniverse: string[];
  purpose: string;
  lawfulBasisOrLegitimateInterest: string;
  expectedRecipients: string[];
  retentionPeriod: string;
  dataSource: string[];
  sourceEvidence: Array<{
    file: string;
    line: number;
    column?: number;
    snippet: string;
  }>;
  reviewStatus: "complete" | "needs_review";
  gaps: string[];
}

export interface RatDraft {
  jurisdiction: string;
  law: string;
  generatedAt: string;
  records: RatRecord[];
}

export interface DpiaTriggerAssessment {
  required: boolean | "unknown";
  confidence: "low" | "medium" | "high";
  lawReference: string;
  triggers: Array<{
    id: string;
    present: boolean | "unknown";
    reason: string;
  }>;
  recommendation: string;
}

export interface DpiaDraft {
  jurisdiction: string;
  lawName: string;
  triggerAssessment: DpiaTriggerAssessment;
  processingSummary: string;
  risks: Finding[];
  recommendedControls: string[];
  humanReviewChecklist: string[];
}

export interface Gap {
  id: string;
  type: string;
  severity: RiskLevel;
  title: string;
}

export interface RemediationCase {
  id: string;
  priority: RiskLevel;
  title: string;
  recommendation: string;
}

export interface JurisdictionPack {
  id: string;
  country: string;
  lawName: string;
  version: string;
  evaluate(scanResult: ScanResult, declaration?: PrivacyDeclaration): JurisdictionAssessment;
  generateRopaDraft(scanResult: ScanResult, declaration?: PrivacyDeclaration): RopaDraft;
  generateRatDraft?(scanResult: ScanResult, declaration?: PrivacyDeclaration): RatDraft;
  generateDpiaDraft(scanResult: ScanResult, declaration?: PrivacyDeclaration): DpiaDraft;
  evaluateDpiaTriggers(scanResult: ScanResult, declaration?: PrivacyDeclaration): DpiaTriggerAssessment;
}
