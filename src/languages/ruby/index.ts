import type { LanguageAdapter, NormalizedCodeModel, SourceFile } from "../../core/scan/types.js";
import { evidenceAt } from "../shared/text.js";

export const rubyAdapter: LanguageAdapter = {
  id: "ruby",
  name: "Ruby",
  supportedExtensions: [".rb"],
  parse(files: SourceFile[]): NormalizedCodeModel {
    const model: NormalizedCodeModel = {
      files,
      languages: ["ruby"],
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
      const attrPattern = /\battr_(?:accessor|reader|writer)\s+([^\n]+)/g;
      for (const match of file.text.matchAll(attrPattern)) {
        for (const name of symbolNames(match[1])) addDataField(model, file, name, match.index ?? 0);
      }

      const paramPattern = /\bdef\s+([A-Za-z_][\w!?=]*)\s*(?:\(([^)]*)\)|\s+([^\n]+))?/g;
      for (const match of file.text.matchAll(paramPattern)) {
        const evidence = evidenceAt(file, match.index ?? 0, "ruby");
        model.symbols.push({ name: match[1], kind: "function", evidence });
        for (const name of parameterNames(match[2] ?? match[3] ?? "")) addDataField(model, file, name, match.index ?? 0);
      }

      const paramsAccessPattern = /\bparams(?:\[['":]([A-Za-z_][\w-]*)['"]?\]|\[:([A-Za-z_][\w-]*)\])/g;
      for (const match of file.text.matchAll(paramsAccessPattern)) {
        addDataField(model, file, match[1] ?? match[2], match.index ?? 0);
      }

      const permitPattern = /\bpermit\(([^)]*)\)/g;
      for (const match of file.text.matchAll(permitPattern)) {
        for (const name of symbolNames(match[1])) addDataField(model, file, name, match.index ?? 0);
      }

      const hashKeyPattern = /(?:^|[,{(]\s*)(?::([A-Za-z_][\w-]*)|["']([A-Za-z_][\w-]*)["']\s*=>|([A-Za-z_][\w-]*)\s*:)/gm;
      for (const match of file.text.matchAll(hashKeyPattern)) {
        addDataField(model, file, match[1] ?? match[2] ?? match[3], match.index ?? 0);
      }

      const activeRecordColumnPattern = /\bt\.(?:string|text|integer|date|datetime|decimal|float|boolean|jsonb?)\s+["']([A-Za-z_][\w-]*)["']/g;
      for (const match of file.text.matchAll(activeRecordColumnPattern)) {
        addDataField(model, file, match[1], match.index ?? 0);
      }

      const callPattern = /\b([A-Za-z_][\w]*(?:(?:\.|::)[A-Za-z_][\w!?]*)*)\s*(?:\(([\s\S]*?)\)|\s+([^\n]+))/g;
      for (const match of file.text.matchAll(callPattern)) {
        const call = { name: match[1], args: match[2] ?? match[3] ?? "", evidence: evidenceAt(file, match.index ?? 0, "ruby") };
        model.functionCalls.push(call);
        if (/^(puts|p|Rails\.logger\.(info|debug|error|warn))$/.test(call.name)) model.loggingCalls.push(call);
        if (/(Net::HTTP|Faraday|HTTParty|RestClient|HTTPX|URI\.open)/.test(call.name) || /https?:\/\//i.test(call.args)) model.externalCalls.push(call);
      }

      const requirePattern = /^\s*require\s+["']([^"']+)["']/gm;
      for (const match of file.text.matchAll(requirePattern)) {
        model.imports.push({ source: match[1], specifiers: [], evidence: evidenceAt(file, match.index ?? 0, "ruby") });
      }

      const commentPattern = /#(.*)$/gm;
      for (const match of file.text.matchAll(commentPattern)) {
        model.comments.push({ text: match[1].trim(), evidence: evidenceAt(file, match.index ?? 0, "ruby") });
      }
    }

    model.evidence = [...model.dataFields.map((field) => field.evidence), ...model.functionCalls.map((call) => call.evidence), ...model.imports.map((item) => item.evidence)];
    return model;
  }
};

function addDataField(model: NormalizedCodeModel, file: SourceFile, name: string | undefined, index: number): void {
  if (!name) return;
  const evidence = evidenceAt(file, index, "ruby");
  model.dataFields.push({ name, evidence });
  model.symbols.push({ name, kind: "property", evidence });
}

function symbolNames(text: string): string[] {
  return [...text.matchAll(/:([A-Za-z_][\w-]*)|["']([A-Za-z_][\w-]*)["']/g)].map((match) => match[1] ?? match[2]);
}

function parameterNames(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim().replace(/[:=].*$/, "").replace(/^\*/, ""))
    .filter((part) => /^[A-Za-z_][\w-]*$/.test(part));
}
