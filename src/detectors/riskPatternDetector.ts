import { classifyPersonalData } from "./personalDataDictionary.js";
import { getCallExpressions, getStringLiteralValues, locationFromIndex } from "../core/source.js";
import type { Detector, PersonalDataCategory, RiskFinding } from "../core/types.js";

const analyticsLibraries = [
  "analytics",
  "segment",
  "mixpanel",
  "amplitude",
  "posthog",
  "google-analytics",
  "gtag",
  "hotjar"
];

const externalCallNames = ["fetch", "axios", "got", "request", "superagent.post", "superagent.get"];

export const riskPatternDetector: Detector = {
  id: "risk-patterns",
  run(context) {
    const risks: RiskFinding[] = [];
    const allCategories = new Set<PersonalDataCategory>();
    const allSourceText = context.files.map((file) => file.text).join("\n");

    for (const file of context.files) {
      for (const category of categoriesInText(file.text)) {
        allCategories.add(category);
      }

      for (const logCall of getCallExpressions(file.text, ["console.log", "console.info", "console.warn", "logger.info", "logger.debug"])) {
        const relatedData = categoriesInText(logCall.args);
        if (relatedData.length > 0) {
          risks.push({
            id: "logging-personal-data",
            title: "Logging personal data",
            description: "A logging call appears to include personal data. Logs often have broad access and long retention.",
            level: "high",
            evidence: logCall.evidence,
            recommendation: "Redact, hash, or remove personal data from logs and define log retention/access controls.",
            location: locationFromIndex(file, logCall.index),
            relatedData
          });
        }
      }

      for (const call of getCallExpressions(file.text, externalCallNames)) {
        const looksExternal = /https?:\/\//i.test(call.args) || /process\.env\.[A-Z0-9_]*(API|URL|HOST|ENDPOINT)/.test(call.args);
        if (!looksExternal) {
          continue;
        }

        risks.push({
          id: "external-api-transfer",
          title: "Personal data may leave the system",
          description: "A network call targets an external URL or environment-configured endpoint. Review whether personal data is transferred.",
          level: "medium",
          evidence: call.evidence,
          recommendation: "Document recipients, data categories, transfer safeguards, and minimization controls.",
          location: locationFromIndex(file, call.index),
          relatedData: categoriesInText(call.args)
        });
      }

      for (const literal of getStringLiteralValues(file.text)) {
        if (analyticsLibraries.some((library) => literal.value.toLowerCase().includes(library))) {
          risks.push({
            id: "analytics-tracking-library",
            title: "Analytics or tracking library detected",
            description: "Analytics tooling can process identifiers, behavioral data, or device metadata.",
            level: "medium",
            evidence: literal.evidence,
            recommendation: "Document analytics purpose, consent model, opt-out behavior, and data minimization.",
            location: locationFromIndex(file, literal.index),
            relatedData: []
          });
        }
      }
    }

    if (allCategories.size > 0 && !/\b(purpose|processingPurpose|legalBasis|lawfulBasis)\b/i.test(allSourceText)) {
      risks.push({
        id: "missing-purpose-definition",
        title: "Missing purpose or lawful-basis definition",
        description: "Personal data indicators were found, but no nearby purpose or lawful-basis definition was detected in code.",
        level: "medium",
        evidence: "No purpose, processingPurpose, legalBasis, or lawfulBasis marker detected.",
        recommendation: "Document processing purposes and legal/privacy assumptions close to the relevant data model or service.",
        relatedData: [...allCategories]
      });
    }

    if (allCategories.size > 0 && !/\b(retention|retentionPeriod|deleteAfter|expiresAt|ttl)\b/i.test(allSourceText)) {
      risks.push({
        id: "missing-retention-definition",
        title: "Missing retention definition",
        description: "Personal data indicators were found, but no retention or deletion marker was detected in code.",
        level: "medium",
        evidence: "No retention, retentionPeriod, deleteAfter, expiresAt, or ttl marker detected.",
        recommendation: "Define retention periods, deletion triggers, and evidence for deletion behavior.",
        relatedData: [...allCategories]
      });
    }

    return { risks };
  }
};

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
