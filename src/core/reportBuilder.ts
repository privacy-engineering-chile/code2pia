import path from "node:path";
import type { ActivityReference, EvidenceActivity, EvidenceFile } from "./evidence.js";
import type {
  ComplianceCheck,
  DataFlow,
  LawProfile,
  PersonalDataCategory,
  PersonalDataFinding,
  ProcessingActivity,
  RecommendedControl,
  ReportDataFlow,
  ReportFinding,
  ReportLocation,
  RiskFinding,
  RiskLevel,
  ScanReport,
  SourceFileContext
} from "./types.js";

interface BuildReportInput {
  rootPath: string;
  files: SourceFileContext[];
  profile: LawProfile;
  startedAt: string;
  evidence?: EvidenceFile;
  evidencePath?: string;
  activityReference?: ActivityReference;
  personalData: PersonalDataFinding[];
  risks: RiskFinding[];
  dataFlows: DataFlow[];
  missingEvidence: string[];
  overallRisk: RiskLevel;
  disclaimer: string;
}

interface LinkedEvidence {
  key: string;
  source: string;
  activity: EvidenceActivity;
}

const schemaVersion = "0.1.0";
const toolVersion = "0.1.0";

const categoryLabels: Record<PersonalDataCategory, string> = {
  rut: "national_identifier",
  email: "contact_data",
  phone: "contact_data",
  address: "contact_data",
  name: "identity_data",
  birthDate: "demographic_data",
  accountNumber: "financial_data",
  health: "health_data",
  location: "location_data",
  biometric: "biometric_data",
  genetic: "biological_profile_or_genetic_data",
  ethnicRace: "ethnic_or_racial_origin",
  politicalAffiliation: "political_affiliation",
  unionAffiliation: "union_or_guild_affiliation",
  socioeconomic: "socioeconomic_status",
  ideologyBelief: "ideological_or_philosophical_belief",
  religion: "religious_belief",
  sexualLife: "sexual_life",
  sexualOrientation: "sexual_orientation",
  genderIdentity: "gender_identity"
};

const chileSensitiveCategories = new Set<PersonalDataCategory>([
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

export function buildEvidenceReport(input: BuildReportInput): ScanReport {
  const linkedEvidence = resolveLinkedEvidence(input);
  const purpose = inferPurpose(input.files, input.risks, linkedEvidence);
  const lawfulBasis = inferLawfulBasis(input.files, linkedEvidence);
  const requiresPIA = inferRequiresPia(input.personalData, input.risks, input.dataFlows);
  const findings = buildFindings(input.rootPath, input.risks);
  const reportFlows = buildDataFlows(input.rootPath, input.dataFlows);
  const complianceChecks = buildComplianceChecks(input, purpose, lawfulBasis, linkedEvidence);
  const recommendedControls = buildRecommendedControls(input, complianceChecks);
  const missingEvidence = buildMissingEvidence(input.missingEvidence, complianceChecks);

  return {
    schemaVersion,
    tool: {
      name: "code2pia",
      version: toolVersion
    },
    scan: {
      repository: path.basename(input.rootPath),
      path: input.rootPath,
      commit: null,
      startedAt: input.startedAt,
      languages: inferLanguages(input.files),
      filesScanned: input.files.length
    },
    jurisdiction:
      input.profile === "chile-21719"
        ? { country: "CL", law: "Ley 21.719", mode: "draft_pia" }
        : { country: "unknown", law: "generic privacy review", mode: "draft_pia" },
    summary: {
      requiresHumanReview: true,
      requiresPIA,
      overallRisk: input.overallRisk,
      confidence: inferConfidence(input.personalData, input.risks),
      mainReasons: buildMainReasons(input.personalData, input.risks, input.dataFlows, missingEvidence)
    },
    processingActivities: buildProcessingActivities(input.rootPath, input.personalData, purpose, lawfulBasis, linkedEvidence),
    dataFlows: reportFlows,
    findings,
    complianceChecks,
    recommendedControls,
    missingEvidence,
    disclaimer: input.disclaimer
  };
}

function buildProcessingActivities(
  rootPath: string,
  personalData: PersonalDataFinding[],
  purpose: { detected: string | null; declared: string | null; status: "declared" | "detected" | "missing"; source?: string | null },
  lawfulBasis: { detected: string | null; declared: string | null; status: "declared" | "detected" | "missing"; source?: string | null },
  linkedEvidence: LinkedEvidence | undefined
): ProcessingActivity[] {
  if (personalData.length === 0) {
    return [];
  }

  const grouped = new Map<string, ProcessingActivity["personalData"][number]>();
  for (const finding of personalData) {
    const key = `${finding.category}:${finding.identifier}`;
    const current =
      grouped.get(key) ??
      ({
        field: finding.identifier,
        category: categoryLabels[finding.category],
        sensitivity: finding.sensitivity,
        necessity: fieldNecessity(linkedEvidence, finding.identifier),
        locations: []
      } satisfies ProcessingActivity["personalData"][number]);

    current.locations.push(toReportLocation(rootPath, finding.location.file, finding.location.line, finding.location.column, finding.evidence));
    grouped.set(key, current);
  }

  return [
    {
      id: "pa_001",
      activityKey: linkedEvidence?.key ?? null,
      name: linkedEvidence?.activity.name ?? inferActivityName(personalData),
      purpose,
      lawfulBasis,
      dataSubjects: linkedEvidence?.activity.dataSubjects.length ? linkedEvidence.activity.dataSubjects : inferDataSubjects(personalData),
      retention: linkedEvidence?.activity.retention
        ? { declared: linkedEvidence.activity.retention, status: "declared", source: `${linkedEvidence.source}.retention` }
        : { declared: null, status: "missing", source: null },
      personalData: [...grouped.values()]
    }
  ];
}

function buildDataFlows(rootPath: string, dataFlows: DataFlow[]): ReportDataFlow[] {
  return dataFlows.map((flow, index) => ({
    id: id("flow", index),
    from: flow.from,
    to: flow.leavesSystem ? extractDestination(flow.evidence) ?? flow.to : flow.to,
    data: flow.personalData,
    purpose: "unknown",
    externalRecipient: flow.leavesSystem,
    internationalTransfer: flow.leavesSystem ? "unknown" : "unlikely",
    risk: flow.leavesSystem ? "high" : flow.personalData.length > 0 ? "medium" : "low",
    evidence: flow.location ? [toReportLocation(rootPath, flow.location.file, flow.location.line, flow.location.column, flow.evidence)] : []
  }));
}

function buildFindings(rootPath: string, risks: RiskFinding[]): ReportFinding[] {
  return risks
    .slice()
    .sort((a, b) => riskWeight(b.level) - riskWeight(a.level))
    .map((risk, index) => ({
      id: id("finding", index),
      severity: risk.level,
      type: risk.id.replace(/-/g, "_"),
      title: risk.title,
      description: risk.description,
      evidence: risk.location ? [toReportLocation(rootPath, risk.location.file, risk.location.line, risk.location.column, risk.evidence)] : [],
      chileanLawMapping: {
        principles: lawPrinciplesForRisk(risk.id),
        reviewRequired: true
      },
      recommendation: risk.recommendation
    }));
}

function buildComplianceChecks(
  input: BuildReportInput,
  purpose: { status: "declared" | "detected" | "missing" },
  lawfulBasis: { status: "declared" | "detected" | "missing" },
  linkedEvidence: LinkedEvidence | undefined
): ScanReport["complianceChecks"] {
  const hasPersonalData = input.personalData.length > 0;
  const categories = new Set(input.personalData.map((finding) => finding.category));
  const hasSensitiveData = input.personalData.some((finding) => chileSensitiveCategories.has(finding.category));
  const hasExternalTransfer = input.dataFlows.some((flow) => flow.leavesSystem);
  const hasLoggingRisk = input.risks.some((risk) => risk.id === "logging-personal-data");
  const hasAnalytics = input.risks.some((risk) => risk.id === "analytics-tracking-library");
  const hasDeclaredRetention = Boolean(linkedEvidence?.activity.retention);
  const hasMissingRetentionRisk = input.risks.some((risk) => risk.id === "missing-retention-definition") && !hasDeclaredRetention;
  const allDetectedFieldsHaveNecessity = input.personalData.every((finding) => Boolean(fieldNecessity(linkedEvidence, finding.identifier)?.declared));

  return {
    purposeLimitation: check(
      !hasPersonalData ? "pass" : purpose.status === "missing" ? "fail" : "warning",
      !hasPersonalData
        ? "No personal data indicators were detected."
        : purpose.status === "missing"
          ? "Purpose was not declared for detected personal data."
          : "Purpose evidence was detected but needs human validation."
    ),
    dataMinimization: check(
      !hasPersonalData ? "pass" : allDetectedFieldsHaveNecessity ? "pass" : categories.size >= 5 || categories.has("rut") ? "warning" : "pass",
      !hasPersonalData
        ? "No personal data indicators were detected."
        : allDetectedFieldsHaveNecessity
          ? "Necessity metadata was declared for detected personal data fields."
        : categories.has("rut")
          ? "RUT is collected but necessity was not documented."
          : "Review whether detected fields are necessary for the declared purpose."
    ),
    lawfulBasis: check(
      !hasPersonalData ? "pass" : lawfulBasis.status === "missing" ? "fail" : "warning",
      !hasPersonalData
        ? "No personal data indicators were detected."
        : lawfulBasis.status === "missing"
          ? "Lawful basis was not declared for detected personal data."
          : "Lawful basis evidence was detected but needs human validation."
    ),
    retention: check(
      !hasPersonalData ? "pass" : hasDeclaredRetention ? "warning" : hasMissingRetentionRisk ? "fail" : "warning",
      !hasPersonalData
        ? "No personal data indicators were detected."
        : hasDeclaredRetention
          ? "Retention evidence was declared but needs human validation."
        : hasMissingRetentionRisk
          ? "No retention policy metadata found."
          : "Retention-like metadata was detected but needs human validation."
    ),
    securityMeasures: check(
      hasLoggingRisk ? "warning" : hasPersonalData ? "unknown" : "pass",
      hasLoggingRisk
        ? "Logging risk detected."
        : hasPersonalData
          ? "No direct evidence of security measures was inferred."
          : "No personal data indicators were detected."
    ),
    transparency: check(
      hasPersonalData ? "unknown" : "pass",
      hasPersonalData ? "No privacy notice or transparency evidence was detected." : "No personal data indicators were detected."
    ),
    dataSubjectRights: check(
      hasPersonalData ? "unknown" : "pass",
      hasPersonalData
        ? "No endpoints or workflows for access, deletion, rectification, opposition, portability or blocking were detected."
        : "No personal data indicators were detected."
    ),
    thirdParties: check(
      hasExternalTransfer || hasAnalytics ? "warning" : "pass",
      hasExternalTransfer || hasAnalytics ? "External API or analytics calls detected but recipient role is unknown." : "No third-party processing signals were detected."
    ),
    internationalTransfers: check(
      hasExternalTransfer ? "unknown" : "pass",
      hasExternalTransfer ? "External destination country could not be inferred." : "No external transfer indicators were detected."
    ),
    sensitiveData: check(
      hasSensitiveData ? "fail" : "pass",
      hasSensitiveData ? "Sensitive or high-sensitivity data was detected and requires special legal/privacy review." : "No sensitive data indicators were detected."
    )
  };
}

function buildRecommendedControls(input: BuildReportInput, checks: ScanReport["complianceChecks"]): RecommendedControl[] {
  const controls: RecommendedControl[] = [];

  if (checks.purposeLimitation.status === "fail" || checks.lawfulBasis.status === "fail") {
    controls.push({ priority: "high", control: "Define purpose and lawful basis for each personal data field." });
  }

  if (input.risks.some((risk) => risk.id === "logging-personal-data")) {
    controls.push({ priority: "high", control: "Mask or remove personal data from logs." });
  }

  if (checks.retention.status === "fail") {
    controls.push({ priority: "medium", control: "Add retention metadata and deletion criteria for personal data." });
  }

  if (checks.thirdParties.status === "warning") {
    controls.push({ priority: "medium", control: "Document third parties, processors, recipients, and transfer safeguards." });
  }

  if (checks.dataSubjectRights.status === "unknown") {
    controls.push({ priority: "medium", control: "Add or document data subject rights workflows for access, rectification, deletion, opposition, portability, and blocking." });
  }

  return controls;
}

function buildMissingEvidence(_baseMissingEvidence: string[], checks: ScanReport["complianceChecks"]): string[] {
  const missing = new Set<string>();
  const labels: Array<[keyof ScanReport["complianceChecks"], string]> = [
    ["purposeLimitation", "Declared purpose"],
    ["lawfulBasis", "Lawful basis"],
    ["retention", "Retention period"],
    ["thirdParties", "Processor / third-party contracts"],
    ["internationalTransfers", "International transfer assessment"],
    ["dataSubjectRights", "Data subject rights workflow"],
    ["transparency", "Privacy notice / transparency evidence"]
  ];

  for (const [key, label] of labels) {
    if (checks[key].status === "fail" || checks[key].status === "unknown") {
      missing.add(label);
    }
  }

  return [...missing];
}

function buildMainReasons(personalData: PersonalDataFinding[], risks: RiskFinding[], dataFlows: DataFlow[], missingEvidence: string[]): string[] {
  const reasons = new Set<string>();
  for (const category of new Set(personalData.map((finding) => finding.category))) {
    reasons.add(`${category} detected in code`);
  }
  for (const risk of risks.slice(0, 4)) {
    reasons.add(risk.title);
  }
  if (dataFlows.some((flow) => flow.leavesSystem)) {
    reasons.add("External API call may transfer personal data");
  }
  if (missingEvidence.some((item) => /retention/i.test(item))) {
    reasons.add("No retention metadata found");
  }
  return [...reasons].slice(0, 8);
}

function resolveLinkedEvidence(input: BuildReportInput): LinkedEvidence | undefined {
  const key = input.activityReference?.key;
  if (!key || !input.evidence?.activities[key]) {
    return undefined;
  }

  return {
    key,
    source: `${input.evidencePath ?? "evidence" }#activities.${key}`,
    activity: input.evidence.activities[key]
  };
}

function fieldNecessity(linkedEvidence: LinkedEvidence | undefined, field: string): ProcessingActivity["personalData"][number]["necessity"] {
  const necessity = linkedEvidence?.activity.fields[field]?.necessity;
  if (!linkedEvidence || !necessity) {
    return { declared: null, status: "missing", source: null };
  }

  return {
    declared: necessity,
    status: "declared",
    source: `${linkedEvidence.source}.fields.${field}.necessity`
  };
}

function inferRequiresPia(personalData: PersonalDataFinding[], risks: RiskFinding[], dataFlows: DataFlow[]): "unlikely" | "possible" | "likely" {
  const highSensitivity = personalData.some((finding) => chileSensitiveCategories.has(finding.category));
  const leavesSystem = dataFlows.some((flow) => flow.leavesSystem);
  const logging = risks.some((risk) => risk.id === "logging-personal-data");
  if (highSensitivity || (leavesSystem && personalData.length > 0) || logging) {
    return "likely";
  }
  return personalData.length > 0 ? "possible" : "unlikely";
}

function inferPurpose(
  files: SourceFileContext[],
  risks: RiskFinding[],
  linkedEvidence: LinkedEvidence | undefined
): { detected: string | null; declared: string | null; status: "declared" | "detected" | "missing"; source?: string | null } {
  if (linkedEvidence) {
    return {
      detected: linkedEvidence.activity.purpose,
      declared: linkedEvidence.activity.purpose,
      status: "declared",
      source: `${linkedEvidence.source}.purpose`
    };
  }

  for (const file of files) {
    const match = file.text.match(/\b(?:processingPurpose|purpose)\s*=\s*["'`]([^"'`]+)["'`]/i);
    if (match) {
      return { detected: match[1], declared: match[1], status: "declared" };
    }
  }

  if (!risks.some((risk) => risk.id === "missing-purpose-definition")) {
    return { detected: "purpose-like code marker", declared: null, status: "detected" };
  }

  return { detected: null, declared: null, status: "missing" };
}

function inferLawfulBasis(
  files: SourceFileContext[],
  linkedEvidence: LinkedEvidence | undefined
): { detected: string | null; declared: string | null; status: "declared" | "detected" | "missing"; source?: string | null } {
  if (linkedEvidence) {
    return {
      detected: linkedEvidence.activity.lawfulBasis,
      declared: linkedEvidence.activity.lawfulBasis,
      status: "declared",
      source: `${linkedEvidence.source}.lawfulBasis`
    };
  }

  for (const file of files) {
    const match = file.text.match(/\b(?:lawfulBasis|legalBasis)\s*=\s*["'`]([^"'`]+)["'`]/i);
    if (match) {
      return { detected: match[1], declared: match[1], status: "declared" };
    }
  }
  return { detected: null, declared: null, status: "missing" };
}

function inferActivityName(personalData: PersonalDataFinding[]): string {
  const paths = personalData.map((finding) => finding.location.file.toLowerCase()).join(" ");
  if (/customer/.test(paths)) {
    return "Customer registration";
  }
  if (/patient|health/.test(paths)) {
    return "Patient data processing";
  }
  if (/contact/.test(paths)) {
    return "Contact request handling";
  }
  if (/user/.test(paths)) {
    return "User account processing";
  }
  return "Detected personal data processing";
}

function inferDataSubjects(personalData: PersonalDataFinding[]): string[] {
  const paths = personalData.map((finding) => finding.location.file.toLowerCase()).join(" ");
  if (/customer/.test(paths)) {
    return ["customers"];
  }
  if (/patient/.test(paths)) {
    return ["patients"];
  }
  if (/employee/.test(paths)) {
    return ["employees"];
  }
  if (/user/.test(paths)) {
    return ["users"];
  }
  return ["unknown"];
}

function inferLanguages(files: SourceFileContext[]): string[] {
  const languages = new Set<string>();
  for (const file of files) {
    if (/\.(ts|tsx)$/.test(file.path)) {
      languages.add("typescript");
    } else if (/\.(js|jsx|mjs|cjs)$/.test(file.path)) {
      languages.add("javascript");
    }
  }
  return [...languages];
}

function inferConfidence(personalData: PersonalDataFinding[], risks: RiskFinding[]): "low" | "medium" | "high" {
  if (personalData.length > 0 && risks.length > 0) {
    return "medium";
  }
  return personalData.length > 0 ? "medium" : "high";
}

function riskWeight(level: RiskLevel): number {
  return level === "high" ? 3 : level === "medium" ? 2 : 1;
}

function extractDestination(evidence: string): string | undefined {
  const url = evidence.match(/https?:\/\/[^"',)\s]+/i);
  if (url) {
    return url[0];
  }

  const envName = evidence.match(/process\.env\.([A-Z0-9_]*(?:API|URL|HOST|ENDPOINT)[A-Z0-9_]*)/);
  if (envName) {
    return `env:${envName[1]}`;
  }

  return undefined;
}

function lawPrinciplesForRisk(riskId: string): string[] {
  if (riskId === "logging-personal-data") {
    return ["security", "confidentiality", "responsibility"];
  }
  if (riskId === "external-api-transfer") {
    return ["transparency", "responsibility", "third_parties", "international_transfers"];
  }
  if (riskId === "missing-purpose-definition") {
    return ["purpose_limitation", "lawfulness", "transparency"];
  }
  if (riskId === "missing-retention-definition") {
    return ["proportionality", "minimization", "retention"];
  }
  if (riskId === "analytics-tracking-library") {
    return ["transparency", "purpose_limitation", "third_parties"];
  }
  return ["responsibility"];
}

function toReportLocation(rootPath: string, file: string, line: number, column: number | undefined, snippet: string): ReportLocation {
  return {
    file: path.relative(rootPath, file),
    line,
    column,
    snippet
  };
}

function check(status: ComplianceCheck["status"], reason: string): ComplianceCheck {
  return { status, reason };
}

function id(prefix: string, index: number): string {
  return `${prefix}_${String(index + 1).padStart(3, "0")}`;
}
