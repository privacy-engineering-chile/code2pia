import { classifyPersonalData } from "./personalDataDictionary.js";
import { getPropertyLikeIdentifiers, isEnvFile, locationFromIndex } from "../core/source.js";
import type { Detector, PersonalDataFinding } from "../core/types.js";

export const personalDataDetector: Detector = {
  id: "personal-data",
  run(context) {
    const findings: PersonalDataFinding[] = [];
    const seen = new Set<string>();

    for (const file of context.files) {
      const candidates = [...getPropertyLikeIdentifiers(file.text)];

      if (isEnvFile(file.path)) {
        candidates.push(...extractEnvKeys(file.text));
      }

      for (const candidate of candidates) {
        const rule = classifyPersonalData(candidate.name);
        if (!rule) {
          continue;
        }

        const location = locationFromIndex(file, candidate.index);
        const key = `${file.path}:${location.line}:${candidate.name}:${rule.category}`;
        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        findings.push({
          category: rule.category,
          identifier: candidate.name,
          confidence: isEnvFile(file.path) ? 0.72 : 0.82,
          sensitivity: rule.sensitivity,
          evidence: candidate.evidence,
          location
        });
      }
    }

    return { personalData: findings };
  }
};

function extractEnvKeys(text: string): Array<{ name: string; index: number; evidence: string }> {
  const keys: Array<{ name: string; index: number; evidence: string }> = [];
  const envPattern = /^([A-Z0-9_]*(?:EMAIL|PHONE|ADDRESS|RUT|LOCATION|HEALTH|NAME|ACCOUNT)[A-Z0-9_]*)=/gim;

  for (const match of text.matchAll(envPattern)) {
    keys.push({
      name: match[1],
      index: match.index,
      evidence: match[0].trim()
    });
  }

  return keys;
}
