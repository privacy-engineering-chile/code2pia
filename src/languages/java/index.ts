import type { LanguageAdapter, NormalizedCodeModel, SourceFile } from "../../core/scan/types.js";
import { evidenceAt } from "../shared/text.js";

export const javaAdapter: LanguageAdapter = {
  id: "java",
  name: "Java",
  supportedExtensions: [".java"],
  parse(files: SourceFile[]): NormalizedCodeModel {
    const model: NormalizedCodeModel = {
      files,
      languages: ["java"],
      symbols: [],
      dataFields: [],
      functionCalls: [],
      externalCalls: [],
      loggingCalls: [],
      imports: [],
      comments: [],
      evidence: []
    };

    for (const file of files) {
      const fieldPattern = /^\s*(?:private|protected|public)?\s*(?:final\s+)?[A-Za-z0-9_<>, ?]+\s+([A-Za-z_][\w]*)\s*(?:;|=)/gm;
      for (const match of file.text.matchAll(fieldPattern)) {
        const evidence = evidenceAt(file, match.index ?? 0, "java");
        model.dataFields.push({ name: match[1], evidence });
        model.symbols.push({ name: match[1], kind: "property", evidence });
      }

      const getterSetterPattern = /\b(?:get|set|is)([A-Z][A-Za-z0-9_]*)\s*\(/g;
      for (const match of file.text.matchAll(getterSetterPattern)) {
        const name = decapitalize(match[1]);
        const evidence = evidenceAt(file, match.index ?? 0, "java");
        model.dataFields.push({ name, evidence });
        model.symbols.push({ name, kind: "function", evidence });
      }

      const callPattern = /\b([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)\s*\(([\s\S]*?)\)/g;
      for (const match of file.text.matchAll(callPattern)) {
        const call = { name: match[1], args: match[2], evidence: evidenceAt(file, match.index ?? 0, "java") };
        model.functionCalls.push(call);
        if (/\b(log|logger)\.(info|debug|warn|error)$/.test(call.name)) model.loggingCalls.push(call);
        if (/(RestTemplate|WebClient|HttpClient|OkHttp|exchange|getForObject|postForObject|retrieve|execute)/.test(call.name) || /https?:\/\//i.test(call.args)) {
          model.externalCalls.push(call);
        }
      }

      const importPattern = /^\s*import\s+([A-Za-z0-9_.]+);/gm;
      for (const match of file.text.matchAll(importPattern)) {
        model.imports.push({ source: match[1], specifiers: [], evidence: evidenceAt(file, match.index ?? 0, "java") });
      }
    }

    model.evidence = [...model.dataFields.map((field) => field.evidence), ...model.functionCalls.map((call) => call.evidence), ...model.imports.map((item) => item.evidence)];
    return model;
  }
};

function decapitalize(value: string): string {
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}
