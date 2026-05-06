import type { LanguageAdapter, NormalizedCodeModel, SourceFile } from "../../core/scan/types.js";
import { evidenceAt } from "../shared/text.js";

export const cppAdapter: LanguageAdapter = {
  id: "cpp",
  name: "C++",
  supportedExtensions: [".cpp", ".cc", ".cxx", ".hpp", ".h"],
  parse(files: SourceFile[]): NormalizedCodeModel {
    const model: NormalizedCodeModel = {
      files,
      languages: ["cpp"],
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
      const fieldPattern = /^\s*(?:public:|private:|protected:)?\s*(?:const\s+)?(?:std::)?[A-Za-z_][\w:<>,\s*&]*\s+([A-Za-z_][\w]*)\s*(?:;|=|{)/gm;
      for (const match of file.text.matchAll(fieldPattern)) {
        if (!["return", "if", "for", "while", "switch"].includes(match[1])) addDataField(model, file, match[1], match.index ?? 0);
      }

      const functionPattern = /\b(?:[A-Za-z_][\w:<>,\s*&]+\s+)+([A-Za-z_][\w:]*)\s*\(([^;{}]*)\)\s*(?:const\s*)?(?:\{|;)/g;
      for (const match of file.text.matchAll(functionPattern)) {
        const evidence = evidenceAt(file, match.index ?? 0, "cpp");
        model.symbols.push({ name: match[1], kind: "function", evidence });
        for (const name of parameterNames(match[2])) addDataField(model, file, name, match.index ?? 0);
      }

      const jsonKeyPattern = /\b(?:json|body|payload|request|response|j)\s*\[\s*["']([A-Za-z_][\w-]*)["']\s*\]/g;
      for (const match of file.text.matchAll(jsonKeyPattern)) addDataField(model, file, match[1], match.index ?? 0);

      const callPattern = /\b([A-Za-z_][\w]*(?:(?:::|\.|->)[A-Za-z_][\w]*)*)\s*\(([\s\S]*?)\)/g;
      for (const match of file.text.matchAll(callPattern)) {
        const call = { name: match[1], args: match[2], evidence: evidenceAt(file, match.index ?? 0, "cpp") };
        model.functionCalls.push(call);
        if (/^(printf|fprintf|spdlog::(info|debug|warn|error)|LOG|LOG_[A-Z]+|VLOG)$/.test(call.name)) model.loggingCalls.push(call);
        if (/(curl_easy_perform|httplib::Client|HttpClient|cpr::|Boost::Beast|Poco::Net|request|send)$/i.test(call.name) || /https?:\/\//i.test(call.args)) model.externalCalls.push(call);
      }

      const coutPattern = /\bstd::cout\s*<<([^\n;]+)/g;
      for (const match of file.text.matchAll(coutPattern)) {
        const call = { name: "std::cout", args: match[1], evidence: evidenceAt(file, match.index ?? 0, "cpp") };
        model.functionCalls.push(call);
        model.loggingCalls.push(call);
      }

      const includePattern = /^\s*#include\s+[<"]([^>"]+)[>"]/gm;
      for (const match of file.text.matchAll(includePattern)) {
        model.imports.push({ source: match[1], specifiers: [], evidence: evidenceAt(file, match.index ?? 0, "cpp") });
      }

      const commentPattern = /\/\/(.*)$/gm;
      for (const match of file.text.matchAll(commentPattern)) {
        model.comments.push({ text: match[1].trim(), evidence: evidenceAt(file, match.index ?? 0, "cpp") });
      }
    }

    model.evidence = [...model.dataFields.map((field) => field.evidence), ...model.functionCalls.map((call) => call.evidence), ...model.imports.map((item) => item.evidence)];
    return model;
  }
};

function addDataField(model: NormalizedCodeModel, file: SourceFile, name: string | undefined, index: number): void {
  if (!name) return;
  const evidence = evidenceAt(file, index, "cpp");
  model.dataFields.push({ name, evidence });
  model.symbols.push({ name, kind: "property", evidence });
}

function parameterNames(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim().match(/([A-Za-z_][\w]*)\s*(?:=.*)?$/)?.[1])
    .filter((value): value is string => Boolean(value));
}
