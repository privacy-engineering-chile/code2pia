import { classifyPersonalData } from "../../detectors/personalDataDictionary.js";
import type { DataFlowDetection, Finding, NormalizedCodeModel, PersonalDataDetection } from "../scan/types.js";
import type { PersonalDataCategory } from "../types.js";

export interface ModelDetectorResult {
  personalData?: PersonalDataDetection[];
  findings?: Finding[];
  dataFlows?: DataFlowDetection[];
}

export interface ModelDetector {
  id: string;
  run(model: NormalizedCodeModel, personalData?: PersonalDataDetection[]): ModelDetectorResult;
}

export const personalDataDetector: ModelDetector = {
  id: "personal-data",
  run(model) {
    const detections = new Map<string, PersonalDataDetection>();
    for (const field of model.dataFields) {
      const rule = classifyPersonalData(field.name);
      if (!rule) {
        continue;
      }

      const key = `${rule.category}:${field.name}`;
      const current = detections.get(key) ?? {
        field: field.name,
        category: rule.category,
        sensitivity: rule.sensitivity,
        confidence: 0.82,
        evidence: []
      };
      current.evidence.push(field.evidence);
      detections.set(key, current);
    }

    return { personalData: [...detections.values()] };
  }
};

export const loggingPersonalDataDetector: ModelDetector = {
  id: "logging-personal-data",
  run(model) {
    const findings: Finding[] = [];
    for (const call of model.loggingCalls) {
      const relatedData = categoriesInText(call.args);
      if (relatedData.length === 0) {
        continue;
      }

      findings.push({
        id: "logging-personal-data",
        type: "personal_data_in_logs",
        language: languageForEvidence([call.evidence]),
        severity: "high",
        title: "Possible personal data logged",
        description: "A logging call appears to include personal data.",
        evidence: [call.evidence],
        relatedData,
        recommendation: "Avoid logging personal data or apply masking/tokenization."
      });
    }
    return { findings };
  }
};

export const externalApiDetector: ModelDetector = {
  id: "external-api",
  run(model) {
    const findings: Finding[] = [];
    const dataFlows: DataFlowDetection[] = [];
    let index = 1;

    for (const call of model.externalCalls) {
      const relatedData = categoriesInText(call.args);
      const externalRecipient = /https?:\/\//i.test(call.args) || /process\.env\.[A-Z0-9_]*(API|URL|HOST|ENDPOINT)/.test(call.args);
      if (!externalRecipient && relatedData.length === 0) {
        continue;
      }

      if (externalRecipient) {
        findings.push({
          id: "external-api-transfer",
          type: "external_api_transfer",
          language: languageForEvidence([call.evidence]),
          severity: "medium",
          title: "External API call may transfer personal data",
          description: "A network call targets an external URL or environment-configured endpoint.",
          evidence: [call.evidence],
          relatedData,
          recommendation: "Document recipients, processors, safeguards, and minimization."
        });
      }

      dataFlows.push({
        id: `flow_${String(index).padStart(3, "0")}`,
        from: inferRole(call.evidence.file),
        to: externalRecipient ? extractDestination(`${call.evidence.snippet} ${call.args}`) ?? "external service" : "service",
        data: relatedData,
        externalRecipient,
        internationalTransfer: externalRecipient ? "unknown" : "unlikely",
        risk: externalRecipient ? "high" : relatedData.length > 0 ? "medium" : "low",
        evidence: [call.evidence]
      });
      index += 1;
    }

    return { findings, dataFlows };
  }
};

export const trackingLibraryDetector: ModelDetector = {
  id: "tracking-library",
  run(model) {
    const findings: Finding[] = [];
    const libraries = ["analytics", "segment", "mixpanel", "amplitude", "posthog", "google-analytics", "gtag", "hotjar"];
    for (const item of model.imports) {
      if (!libraries.some((library) => item.source.toLowerCase().includes(library))) {
        continue;
      }

      findings.push({
        id: "analytics-tracking-library",
        type: "tracking_library",
        language: languageForEvidence([item.evidence]),
        severity: "medium",
        title: "Analytics or tracking library detected",
        description: "Analytics tooling can process identifiers, behavioral data, or device metadata.",
        evidence: [item.evidence],
        relatedData: [],
        recommendation: "Document analytics purpose, consent model, opt-out behavior, and event minimization."
      });
    }
    return { findings };
  }
};

export const purposeMetadataDetector: ModelDetector = {
  id: "purpose-metadata",
  run(model, personalData = []) {
    if (personalData.length === 0 || /\b(processingPurpose|purpose|privacyActivity)\b/i.test(model.files.map((file) => file.text).join("\n"))) {
      return { findings: [] };
    }

    return {
      findings: [
        {
          id: "missing-purpose-definition",
          type: "missing_purpose_definition",
          language: languageForEvidence(model.evidence),
          severity: "medium",
          title: "Missing purpose definition",
          description: "Personal data was detected, but no purpose metadata or activity key was found.",
          evidence: [],
          relatedData: [...new Set(personalData.map((item) => item.category))],
          recommendation: "Declare a privacy activity key in code and document purpose in code2pia.privacy.yaml."
        }
      ]
    };
  }
};

export const retentionMetadataDetector: ModelDetector = {
  id: "retention-metadata",
  run(model, personalData = []) {
    if (personalData.length === 0 || /\b(retention|retentionPeriod|deleteAfter|expiresAt|ttl)\b/i.test(model.files.map((file) => file.text).join("\n"))) {
      return { findings: [] };
    }

    return {
      findings: [
        {
          id: "missing-retention-definition",
          type: "missing_retention_definition",
          language: languageForEvidence(model.evidence),
          severity: "medium",
          title: "Missing retention definition",
          description: "Personal data was detected, but no retention metadata was found.",
          evidence: [],
          relatedData: [...new Set(personalData.map((item) => item.category))],
          recommendation: "Document retention in the privacy declaration."
        }
      ]
    };
  }
};

export const defaultModelDetectors: ModelDetector[] = [
  personalDataDetector,
  loggingPersonalDataDetector,
  externalApiDetector,
  trackingLibraryDetector,
  purposeMetadataDetector,
  retentionMetadataDetector
];

function categoriesInText(text: string): PersonalDataCategory[] {
  const categories = new Set<PersonalDataCategory>();
  for (const token of text.split(/[^A-Za-z0-9_$-]+/)) {
    const rule = classifyPersonalData(token);
    if (rule) {
      categories.add(rule.category);
    }
  }
  return [...categories];
}

function languageForEvidence(evidence: Array<{ language: string }>): string {
  return evidence[0]?.language ?? "unknown";
}

function inferRole(filePath: string): string {
  const segments = filePath.toLowerCase().split(/[\\/]+/);
  if (segments.some((segment) => ["api", "routes", "route", "controllers", "controller", "server"].includes(segment))) {
    return "api";
  }
  if (segments.some((segment) => ["client", "frontend", "components", "pages", "app"].includes(segment))) {
    return "frontend";
  }
  return "application";
}

function extractDestination(text: string): string | undefined {
  const url = text.match(/https?:\/\/[^"',)\s]+/i);
  if (url) {
    return url[0];
  }
  const envName = text.match(/process\.env\.([A-Z0-9_]*(?:API|URL|HOST|ENDPOINT)[A-Z0-9_]*)/);
  return envName ? `env:${envName[1]}` : undefined;
}
