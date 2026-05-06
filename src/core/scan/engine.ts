import path from "node:path";
import { defaultModelDetectors } from "../findings/detectors.js";
import { detectGaps } from "../gaps/engine.js";
import { scoreRisk } from "../risk/scoring.js";
import { loadPrivacyDeclaration } from "../../declarations/parser.js";
import { getJurisdictionPack } from "../../jurisdictions/index.js";
import type { JurisdictionAssessment, RopaDraft, RatDraft, DpiaDraft, DpiaTriggerAssessment, Gap, RemediationCase } from "../../jurisdictions/types.js";
import { pythonAdapter } from "../../languages/python/index.js";
import { typescriptAdapter } from "../../languages/typescript/index.js";
import { javaAdapter } from "../../languages/java/index.js";
import { goAdapter } from "../../languages/go/index.js";
import { rubyAdapter } from "../../languages/ruby/index.js";
import { phpAdapter } from "../../languages/php/index.js";
import { cppAdapter } from "../../languages/cpp/index.js";
import { rustAdapter } from "../../languages/rust/index.js";
import { csharpAdapter } from "../../languages/csharp/index.js";
import { mergeModels } from "../../languages/shared/text.js";
import { collectSourceFiles, filesForAdapter } from "./sourceCollector.js";
import type { Finding, LanguageAdapter, NormalizedCodeModel, PersonalDataDetection, ScanResult } from "./types.js";

export interface Code2PiaReport {
  schemaVersion: "0.2.0";
  tool: { name: "code2pia"; version: string };
  scan: {
    repository: string;
    path: string;
    startedAt: string;
    languages: string[];
    filesScanned: number;
    languagesDetected: string[];
  };
  jurisdictionAssessment: JurisdictionAssessment;
  ropaDraft: RopaDraft;
  ratDraft?: RatDraft;
  dpiaTriggerAssessment: DpiaTriggerAssessment;
  dpiaDraft: DpiaDraft;
  gaps: Gap[];
  remediationCases: RemediationCase[];
  scanResult: Omit<ScanResult, "model">;
  disclaimer: string;
}

export interface RunScanOptions {
  jurisdiction: string;
  privacyFile?: string;
  adapters?: LanguageAdapter[];
}

export async function runCode2PiaScan(root: string, options: RunScanOptions): Promise<Code2PiaReport> {
  const rootPath = path.resolve(root);
  const startedAt = new Date().toISOString();
  const adapters = options.adapters ?? [typescriptAdapter, pythonAdapter, javaAdapter, goAdapter, rubyAdapter, phpAdapter, cppAdapter, rustAdapter, csharpAdapter];
  const files = await collectSourceFiles(rootPath, adapters);
  const models = (
    await Promise.all(
      adapters.map(async (adapter) => {
        const adapterFiles = filesForAdapter(files, adapter);
        return adapterFiles.length > 0 ? adapter.parse(adapterFiles) : undefined;
      })
    )
  ).filter((model): model is NormalizedCodeModel => Boolean(model));
  const model: NormalizedCodeModel =
    models.length > 0
      ? mergeModels(models)
      : { files: [], languages: [], symbols: [], dataFields: [], functionCalls: [], externalCalls: [], loggingCalls: [], imports: [], comments: [], evidence: [] };

  let personalData: PersonalDataDetection[] = [];
  let findings: Finding[] = [];
  let dataFlows: ScanResult["dataFlows"] = [];

  for (const detector of defaultModelDetectors) {
    const result = detector.run(model, personalData);
    personalData = mergePersonalData(personalData, result.personalData ?? []);
    findings = [...findings, ...(result.findings ?? [])];
    dataFlows = [...dataFlows, ...(result.dataFlows ?? [])];
  }

  const declaration = await loadPrivacyDeclaration(rootPath, options.privacyFile);
  findings = suppressDeclarationBackedFindings(findings, declaration);

  const scanResult: ScanResult = {
    repository: path.basename(rootPath),
    rootPath,
    startedAt,
    languages: model.languages,
    filesScanned: files.length,
    model,
    personalData,
    findings,
    dataFlows,
    risk: scoreRisk(personalData, findings)
  };

  const pack = getJurisdictionPack(options.jurisdiction);
  const { gaps, remediationCases } = detectGaps(scanResult, declaration);

  return {
    schemaVersion: "0.2.0",
    tool: { name: "code2pia", version: "0.1.0" },
    scan: {
      repository: scanResult.repository,
      path: rootPath,
      startedAt,
      languages: scanResult.languages,
      filesScanned: scanResult.filesScanned,
      languagesDetected: scanResult.languages
    },
    jurisdictionAssessment: pack.evaluate(scanResult, declaration),
    ropaDraft: pack.generateRopaDraft(scanResult, declaration),
    ratDraft: pack.generateRatDraft?.(scanResult, declaration),
    dpiaTriggerAssessment: pack.evaluateDpiaTriggers(scanResult, declaration),
    dpiaDraft: pack.generateDpiaDraft(scanResult, declaration),
    gaps,
    remediationCases,
    scanResult: {
      repository: scanResult.repository,
      rootPath: scanResult.rootPath,
      startedAt: scanResult.startedAt,
      languages: scanResult.languages,
      filesScanned: scanResult.filesScanned,
      personalData: scanResult.personalData,
      findings: scanResult.findings,
      dataFlows: scanResult.dataFlows,
      risk: scanResult.risk
    },
    disclaimer: "This is not legal advice. It is an automatically generated privacy engineering draft and requires human review."
  };
}

function suppressDeclarationBackedFindings(findings: Finding[], declaration: Awaited<ReturnType<typeof loadPrivacyDeclaration>>): Finding[] {
  if (!declaration) {
    return findings;
  }

  const hasPurposeAndLawfulBasis = declaration.processingActivities.some((activity) => activity.purpose && activity.lawfulBasis);
  const hasRetention = declaration.processingActivities.some((activity) => activity.retention);

  return findings.filter((finding) => {
    if (finding.type === "missing_purpose_definition" && hasPurposeAndLawfulBasis) return false;
    if (finding.type === "missing_retention_definition" && hasRetention) return false;
    return true;
  });
}

function mergePersonalData(existing: PersonalDataDetection[], next: PersonalDataDetection[]): PersonalDataDetection[] {
  const map = new Map<string, PersonalDataDetection>();
  for (const item of [...existing, ...next]) {
    const key = `${item.category}:${item.field}`;
    const current = map.get(key) ?? { ...item, evidence: [] };
    current.evidence.push(...item.evidence);
    map.set(key, current);
  }
  return [...map.values()];
}
