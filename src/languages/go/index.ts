import type { LanguageAdapter, NormalizedCodeModel, SourceFile } from "../../core/scan/types.js";
import { evidenceAt } from "../shared/text.js";

export const goAdapter: LanguageAdapter = {
  id: "go",
  name: "Go",
  supportedExtensions: [".go"],
  parse(files: SourceFile[]): NormalizedCodeModel {
    const model: NormalizedCodeModel = {
      files,
      languages: ["go"],
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
      const structFieldPattern = /^\s*([A-Z][A-Za-z0-9_]*)\s+[A-Za-z0-9_\[\]*.]+(?:\s+`[^`]*`)?/gm;
      for (const match of file.text.matchAll(structFieldPattern)) {
        const evidence = evidenceAt(file, match.index ?? 0, "go");
        model.dataFields.push({ name: decapitalize(match[1]), evidence });
        model.symbols.push({ name: decapitalize(match[1]), kind: "property", evidence });
      }

      const assignmentPattern = /\b([a-zA-Z_][\w]*)\s*:=/g;
      for (const match of file.text.matchAll(assignmentPattern)) {
        const evidence = evidenceAt(file, match.index ?? 0, "go");
        model.dataFields.push({ name: match[1], evidence });
        model.symbols.push({ name: match[1], kind: "variable", evidence });
      }

      const callPattern = /\b([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)\s*\(([\s\S]*?)\)/g;
      for (const match of file.text.matchAll(callPattern)) {
        const call = { name: match[1], args: match[2], evidence: evidenceAt(file, match.index ?? 0, "go") };
        model.functionCalls.push(call);
        if (/^(fmt\.Println|fmt\.Printf|log\.(Println|Printf|Print|Fatal|Fatalf))$/.test(call.name)) model.loggingCalls.push(call);
        if (/^(http\.(Get|Post|NewRequest)|client\.Do)$/.test(call.name) || /https?:\/\//i.test(call.args)) model.externalCalls.push(call);
      }

      const importPattern = /import\s+(?:\(\s*)?["']([^"']+)["']/g;
      for (const match of file.text.matchAll(importPattern)) {
        model.imports.push({ source: match[1], specifiers: [], evidence: evidenceAt(file, match.index ?? 0, "go") });
      }
    }

    model.evidence = [...model.dataFields.map((field) => field.evidence), ...model.functionCalls.map((call) => call.evidence), ...model.imports.map((item) => item.evidence)];
    return model;
  }
};

function decapitalize(value: string): string {
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}
