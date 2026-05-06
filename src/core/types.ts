import { z } from "zod";

export const PersonalDataCategorySchema = z.enum([
  "rut",
  "email",
  "phone",
  "address",
  "name",
  "birthDate",
  "accountNumber",
  "health",
  "location",
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

export type PersonalDataCategory = z.infer<typeof PersonalDataCategorySchema>;

export const SensitivitySchema = z.enum(["low", "medium", "high"]);
export type Sensitivity = z.infer<typeof SensitivitySchema>;

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const LawProfileSchema = z.enum(["generic", "chile-21719"]);
export type LawProfile = z.infer<typeof LawProfileSchema>;

export const ComplianceStatusSchema = z.enum(["pass", "warning", "missing-evidence", "action-required"]);
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

export const SourceLocationSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  column: z.number().int().nonnegative().optional()
});

export type SourceLocation = z.infer<typeof SourceLocationSchema>;

export const PersonalDataFindingSchema = z.object({
  category: PersonalDataCategorySchema,
  identifier: z.string(),
  confidence: z.number().min(0).max(1),
  sensitivity: SensitivitySchema,
  evidence: z.string(),
  location: SourceLocationSchema
});

export type PersonalDataFinding = z.infer<typeof PersonalDataFindingSchema>;

export const RiskFindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  level: RiskLevelSchema,
  evidence: z.string(),
  recommendation: z.string(),
  location: SourceLocationSchema.optional(),
  relatedData: z.array(PersonalDataCategorySchema).default([])
});

export type RiskFinding = z.infer<typeof RiskFindingSchema>;

export const DataFlowSchema = z.object({
  from: z.string(),
  to: z.string(),
  personalData: z.array(PersonalDataCategorySchema),
  leavesSystem: z.boolean(),
  evidence: z.string(),
  location: SourceLocationSchema.optional()
});

export type DataFlow = z.infer<typeof DataFlowSchema>;

export const ComplianceFindingSchema = z.object({
  id: z.string(),
  profile: LawProfileSchema,
  topic: z.string(),
  legalReference: z.string(),
  status: ComplianceStatusSchema,
  summary: z.string(),
  evidence: z.array(z.string()),
  recommendation: z.string()
});

export type ComplianceFinding = z.infer<typeof ComplianceFindingSchema>;

export const EipdAssessmentSchema = z.object({
  required: z.boolean(),
  likelihood: RiskLevelSchema,
  triggers: z.array(z.string()),
  rationale: z.string()
});

export type EipdAssessment = z.infer<typeof EipdAssessmentSchema>;

export const ReportLocationSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  column: z.number().int().nonnegative().optional(),
  snippet: z.string().optional()
});

export type ReportLocation = z.infer<typeof ReportLocationSchema>;

export const ComplianceCheckStatusSchema = z.enum(["pass", "warning", "fail", "unknown"]);
export type ComplianceCheckStatus = z.infer<typeof ComplianceCheckStatusSchema>;

export const RequiresPiaSchema = z.enum(["unlikely", "possible", "likely"]);
export type RequiresPia = z.infer<typeof RequiresPiaSchema>;

export const ConfidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const ProcessingActivitySchema = z.object({
  id: z.string(),
  activityKey: z.string().nullable().optional(),
  name: z.string(),
  purpose: z.object({
    detected: z.string().nullable(),
    declared: z.string().nullable(),
    status: z.enum(["declared", "detected", "missing"]),
    source: z.string().nullable().optional()
  }),
  lawfulBasis: z.object({
    detected: z.string().nullable(),
    declared: z.string().nullable(),
    status: z.enum(["declared", "detected", "missing"]),
    source: z.string().nullable().optional()
  }),
  dataSubjects: z.array(z.string()),
  retention: z
    .object({
      declared: z.string().nullable(),
      status: z.enum(["declared", "missing"]),
      source: z.string().nullable().optional()
    })
    .optional(),
  personalData: z.array(
    z.object({
      field: z.string(),
      category: z.string(),
      sensitivity: SensitivitySchema,
      necessity: z
        .object({
          declared: z.string().nullable(),
          status: z.enum(["declared", "missing"]),
          source: z.string().nullable().optional()
        })
        .optional(),
      locations: z.array(ReportLocationSchema)
    })
  )
});

export type ProcessingActivity = z.infer<typeof ProcessingActivitySchema>;

export const ReportDataFlowSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  data: z.array(z.string()),
  purpose: z.string(),
  externalRecipient: z.boolean().optional(),
  internationalTransfer: z.enum(["unknown", "unlikely", "likely"]).optional(),
  risk: RiskLevelSchema,
  evidence: z.array(ReportLocationSchema).default([])
});

export type ReportDataFlow = z.infer<typeof ReportDataFlowSchema>;

export const ReportFindingSchema = z.object({
  id: z.string(),
  severity: RiskLevelSchema,
  type: z.string(),
  title: z.string(),
  description: z.string(),
  evidence: z.array(ReportLocationSchema),
  chileanLawMapping: z
    .object({
      principles: z.array(z.string()),
      reviewRequired: z.boolean()
    })
    .optional(),
  recommendation: z.string()
});

export type ReportFinding = z.infer<typeof ReportFindingSchema>;

export const ComplianceCheckSchema = z.object({
  status: ComplianceCheckStatusSchema,
  reason: z.string()
});

export type ComplianceCheck = z.infer<typeof ComplianceCheckSchema>;

export const RecommendedControlSchema = z.object({
  priority: RiskLevelSchema,
  control: z.string()
});

export type RecommendedControl = z.infer<typeof RecommendedControlSchema>;

export const ScanReportSchema = z.object({
  schemaVersion: z.literal("0.1.0"),
  tool: z.object({
    name: z.literal("code2pia"),
    version: z.string()
  }),
  scan: z.object({
    repository: z.string(),
    path: z.string(),
    commit: z.string().nullable(),
    startedAt: z.string(),
    languages: z.array(z.string()),
    filesScanned: z.number().int().nonnegative()
  }),
  jurisdiction: z.object({
    country: z.string(),
    law: z.string(),
    mode: z.literal("draft_pia")
  }),
  summary: z.object({
    requiresHumanReview: z.boolean(),
    requiresPIA: RequiresPiaSchema,
    overallRisk: RiskLevelSchema,
    confidence: ConfidenceSchema,
    mainReasons: z.array(z.string())
  }),
  processingActivities: z.array(ProcessingActivitySchema),
  dataFlows: z.array(ReportDataFlowSchema),
  findings: z.array(ReportFindingSchema),
  complianceChecks: z.object({
    purposeLimitation: ComplianceCheckSchema,
    dataMinimization: ComplianceCheckSchema,
    lawfulBasis: ComplianceCheckSchema,
    retention: ComplianceCheckSchema,
    securityMeasures: ComplianceCheckSchema,
    transparency: ComplianceCheckSchema,
    dataSubjectRights: ComplianceCheckSchema,
    thirdParties: ComplianceCheckSchema,
    internationalTransfers: ComplianceCheckSchema,
    sensitiveData: ComplianceCheckSchema
  }),
  recommendedControls: z.array(RecommendedControlSchema),
  missingEvidence: z.array(z.string()),
  disclaimer: z.string()
});

export type ScanReport = z.infer<typeof ScanReportSchema>;

export interface SourceFileContext {
  path: string;
  text: string;
  lineStarts: number[];
}

export interface DetectorContext {
  rootPath: string;
  files: SourceFileContext[];
}

export interface DetectorResult {
  personalData?: PersonalDataFinding[];
  risks?: RiskFinding[];
  dataFlows?: DataFlow[];
}

export interface Detector {
  id: string;
  run(context: DetectorContext): DetectorResult;
}
