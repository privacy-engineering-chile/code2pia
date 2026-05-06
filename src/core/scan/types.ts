import type { PersonalDataCategory, RiskLevel, Sensitivity, SourceLocation } from "../types.js";

export interface SourceFile {
  path: string;
  text: string;
  language?: string;
}

export interface NormalizedEvidence {
  file: string;
  line: number;
  column?: number;
  snippet: string;
  language: string;
}

export interface NormalizedSymbol {
  name: string;
  kind: "interface" | "type" | "class" | "function" | "variable" | "property" | "unknown";
  evidence: NormalizedEvidence;
}

export interface NormalizedDataField {
  name: string;
  container?: string;
  evidence: NormalizedEvidence;
}

export interface NormalizedFunctionCall {
  name: string;
  args: string;
  evidence: NormalizedEvidence;
}

export interface NormalizedImport {
  source: string;
  specifiers: string[];
  evidence: NormalizedEvidence;
}

export interface NormalizedComment {
  text: string;
  evidence: NormalizedEvidence;
}

export interface NormalizedCodeModel {
  files: SourceFile[];
  languages: string[];
  symbols: NormalizedSymbol[];
  dataFields: NormalizedDataField[];
  functionCalls: NormalizedFunctionCall[];
  externalCalls: NormalizedFunctionCall[];
  loggingCalls: NormalizedFunctionCall[];
  imports: NormalizedImport[];
  comments: NormalizedComment[];
  evidence: NormalizedEvidence[];
}

export interface LanguageAdapter {
  id: string;
  name: string;
  supportedExtensions: string[];
  parse(files: SourceFile[]): NormalizedCodeModel;
}

export interface PersonalDataDetection {
  field: string;
  category: PersonalDataCategory;
  sensitivity: Sensitivity;
  confidence: number;
  evidence: NormalizedEvidence[];
}

export interface Finding {
  id: string;
  type: string;
  language: string;
  severity: RiskLevel;
  title: string;
  description: string;
  evidence: NormalizedEvidence[];
  relatedData: PersonalDataCategory[];
  recommendation: string;
}

export interface DataFlowDetection {
  id: string;
  from: string;
  to: string;
  data: PersonalDataCategory[];
  externalRecipient: boolean;
  internationalTransfer: "unknown" | "unlikely" | "likely";
  risk: RiskLevel;
  evidence: NormalizedEvidence[];
}

export interface ScanResult {
  repository: string;
  rootPath: string;
  startedAt: string;
  languages: string[];
  filesScanned: number;
  model: NormalizedCodeModel;
  personalData: PersonalDataDetection[];
  findings: Finding[];
  dataFlows: DataFlowDetection[];
  risk: RiskLevel;
}

export function toSourceLocation(evidence: NormalizedEvidence): SourceLocation {
  return {
    file: evidence.file,
    line: evidence.line,
    column: evidence.column
  };
}
