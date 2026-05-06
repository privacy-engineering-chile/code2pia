import type { LanguageAdapter, NormalizedCodeModel, SourceFile } from "../../core/scan/types.js";
import { evidenceAt } from "../shared/text.js";

export const pythonAdapter: LanguageAdapter = {
  id: "python",
  name: "Python",
  supportedExtensions: [".py"],
  parse(files: SourceFile[]): NormalizedCodeModel {
    const model: NormalizedCodeModel = {
      files,
      languages: ["python"],
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
      const assignmentPattern = /\b([A-Za-z_][\w]*)\s*(?::[^=\n]+)?=/g;
      for (const match of file.text.matchAll(assignmentPattern)) {
        const evidence = evidenceAt(file, match.index ?? 0, "python");
        model.dataFields.push({ name: match[1], evidence });
        model.symbols.push({ name: match[1], kind: "variable", evidence });
      }

      const envPattern = /os\.environ(?:\.get)?\(\s*["']([A-Za-z0-9_]+)["']/g;
      for (const match of file.text.matchAll(envPattern)) {
        const evidence = evidenceAt(file, match.index ?? 0, "python");
        model.dataFields.push({ name: match[1], evidence });
        model.symbols.push({ name: match[1], kind: "variable", evidence });
      }

      const functionPattern = /^\s*def\s+([A-Za-z_][\w]*)\s*\(/gm;
      for (const match of file.text.matchAll(functionPattern)) {
        model.symbols.push({ name: match[1], kind: "function", evidence: evidenceAt(file, match.index ?? 0, "python") });
      }

      const callPattern = /\b([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)\s*\(([\s\S]*?)\)/g;
      for (const match of file.text.matchAll(callPattern)) {
        const call = { name: match[1], args: match[2], evidence: evidenceAt(file, match.index ?? 0, "python") };
        model.functionCalls.push(call);
        if (/^(print|logging\.(info|debug|warning|error))$/.test(call.name)) {
          model.loggingCalls.push(call);
        }
        if (/^(requests\.(get|post|put|patch)|httpx\.(get|post|put|patch))$/.test(call.name) || /https?:\/\//i.test(call.args)) {
          model.externalCalls.push(call);
        }
      }

      const importPattern = /^\s*(?:from\s+([A-Za-z0-9_.]+)\s+import|import\s+([A-Za-z0-9_.]+))/gm;
      for (const match of file.text.matchAll(importPattern)) {
        model.imports.push({ source: match[1] ?? match[2], specifiers: [], evidence: evidenceAt(file, match.index ?? 0, "python") });
      }

      const commentPattern = /#(.*)$/gm;
      for (const match of file.text.matchAll(commentPattern)) {
        model.comments.push({ text: match[1].trim(), evidence: evidenceAt(file, match.index ?? 0, "python") });
      }
    }

    model.evidence = [...model.dataFields.map((field) => field.evidence), ...model.functionCalls.map((call) => call.evidence)];
    return model;
  }
};
