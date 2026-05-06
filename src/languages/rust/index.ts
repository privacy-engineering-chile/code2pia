import type { LanguageAdapter, NormalizedCodeModel, SourceFile } from "../../core/scan/types.js";
import { evidenceAt } from "../shared/text.js";

export const rustAdapter: LanguageAdapter = {
  id: "rust",
  name: "Rust",
  supportedExtensions: [".rs"],
  parse(files: SourceFile[]): NormalizedCodeModel {
    const model: NormalizedCodeModel = {
      files,
      languages: ["rust"],
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
      const structOrEnumFieldPattern = /^\s*(?:pub\s+)?([A-Za-z_][\w]*)\s*:\s*[^,\n}]+[,}]?/gm;
      for (const match of file.text.matchAll(structOrEnumFieldPattern)) addDataField(model, file, match[1], match.index ?? 0);

      const serdeRenamePattern = /#\s*\[\s*serde\s*\(\s*rename\s*=\s*["']([A-Za-z_][\w-]*)["']\s*\)\s*\]/g;
      for (const match of file.text.matchAll(serdeRenamePattern)) addDataField(model, file, match[1], match.index ?? 0);

      const functionPattern = /\bfn\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)/g;
      for (const match of file.text.matchAll(functionPattern)) {
        const evidence = evidenceAt(file, match.index ?? 0, "rust");
        model.symbols.push({ name: match[1], kind: "function", evidence });
        for (const name of parameterNames(match[2])) addDataField(model, file, name, match.index ?? 0);
      }

      const callPattern = /\b([A-Za-z_][\w]*(?:(?:::|\.|->)[A-Za-z_][\w!]*|\!)*)\s*(?:!\s*)?\(([\s\S]*?)\)/g;
      for (const match of file.text.matchAll(callPattern)) {
        const name = match[1].replace(/!$/, "");
        const call = { name, args: match[2], evidence: evidenceAt(file, match.index ?? 0, "rust") };
        model.functionCalls.push(call);
        if (/^(println|eprintln|dbg|log::(info|debug|warn|error)|tracing::(info|debug|warn|error))$/.test(call.name)) model.loggingCalls.push(call);
        if (/(reqwest::|Client::new|\.get|\.post|\.put|\.patch|send)$/i.test(call.name) || /https?:\/\//i.test(call.args)) model.externalCalls.push(call);
      }

      const usePattern = /^\s*use\s+([^;]+);/gm;
      for (const match of file.text.matchAll(usePattern)) {
        model.imports.push({ source: match[1].trim(), specifiers: [], evidence: evidenceAt(file, match.index ?? 0, "rust") });
      }

      const commentPattern = /\/\/(.*)$/gm;
      for (const match of file.text.matchAll(commentPattern)) {
        model.comments.push({ text: match[1].trim(), evidence: evidenceAt(file, match.index ?? 0, "rust") });
      }
    }

    model.evidence = [...model.dataFields.map((field) => field.evidence), ...model.functionCalls.map((call) => call.evidence), ...model.imports.map((item) => item.evidence)];
    return model;
  }
};

function addDataField(model: NormalizedCodeModel, file: SourceFile, name: string | undefined, index: number): void {
  if (!name) return;
  const evidence = evidenceAt(file, index, "rust");
  model.dataFields.push({ name, evidence });
  model.symbols.push({ name, kind: "property", evidence });
}

function parameterNames(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim().match(/^([A-Za-z_][\w]*)\s*:/)?.[1])
    .filter((value): value is string => Boolean(value));
}
