import type { LanguageAdapter, NormalizedCodeModel, SourceFile } from "../../core/scan/types.js";
import { evidenceAt } from "../shared/text.js";

export const phpAdapter: LanguageAdapter = {
  id: "php",
  name: "PHP",
  supportedExtensions: [".php"],
  parse(files: SourceFile[]): NormalizedCodeModel {
    const model: NormalizedCodeModel = {
      files,
      languages: ["php"],
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
      const propertyPattern = /\b(?:public|protected|private)\s+(?:static\s+)?(?:\??[A-Za-z_\\][\w\\<>|?]*\s+)?\$([A-Za-z_][\w]*)/g;
      for (const match of file.text.matchAll(propertyPattern)) addDataField(model, file, match[1], match.index ?? 0);

      const functionPattern = /\bfunction\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)/g;
      for (const match of file.text.matchAll(functionPattern)) {
        const evidence = evidenceAt(file, match.index ?? 0, "php");
        model.symbols.push({ name: match[1], kind: "function", evidence });
        for (const name of parameterNames(match[2])) addDataField(model, file, name, match.index ?? 0);
      }

      const requestPattern = /\$request->(?:input|get|query|post)\(\s*["']([A-Za-z_][\w-]*)["']/g;
      for (const match of file.text.matchAll(requestPattern)) addDataField(model, file, match[1], match.index ?? 0);

      const superglobalPattern = /\$_(?:POST|GET|REQUEST|COOKIE|SESSION)\s*\[\s*["']([A-Za-z_][\w-]*)["']\s*\]/g;
      for (const match of file.text.matchAll(superglobalPattern)) addDataField(model, file, match[1], match.index ?? 0);

      const arrayKeyPattern = /["']([A-Za-z_][\w-]*)["']\s*=>/g;
      for (const match of file.text.matchAll(arrayKeyPattern)) addDataField(model, file, match[1], match.index ?? 0);

      const fillablePattern = /\$fillable\s*=\s*\[([\s\S]*?)\]/g;
      for (const match of file.text.matchAll(fillablePattern)) {
        for (const name of quotedNames(match[1])) addDataField(model, file, name, match.index ?? 0);
      }

      const validationPattern = /\b(?:validate|rules)\s*\(\s*\[([\s\S]*?)\]\s*\)/g;
      for (const match of file.text.matchAll(validationPattern)) {
        for (const name of quotedNames(match[1])) addDataField(model, file, name, match.index ?? 0);
      }

      const symfonyRequestPattern = /\bRequest\s+\$request|\$request->request->get\(\s*["']([A-Za-z_][\w-]*)["']/g;
      for (const match of file.text.matchAll(symfonyRequestPattern)) {
        if (match[1]) addDataField(model, file, match[1], match.index ?? 0);
      }

      const callPattern = /(?:\\?([A-Za-z_][\w\\]*)::|->)?([A-Za-z_][\w]*)\s*\(([\s\S]*?)\)/g;
      for (const match of file.text.matchAll(callPattern)) {
        const prefix = match[1];
        const name = prefix ? `${prefix}::${match[2]}` : match[2];
        const call = { name, args: match[3], evidence: evidenceAt(file, match.index ?? 0, "php") };
        model.functionCalls.push(call);
        if (/^(Log::(info|debug|warning|error)|error_log|logger)$/i.test(call.name)) model.loggingCalls.push(call);
        if (/(Http::|GuzzleHttp|Client::|curl_exec|file_get_contents|post|get|request)$/i.test(call.name) || /https?:\/\//i.test(call.args)) model.externalCalls.push(call);
      }

      const importPattern = /^\s*(?:use|include|require(?:_once)?)\s+([^;\n]+);?/gm;
      for (const match of file.text.matchAll(importPattern)) {
        model.imports.push({ source: match[1].trim().replace(/^["']|["']$/g, ""), specifiers: [], evidence: evidenceAt(file, match.index ?? 0, "php") });
      }

      const commentPattern = /(?:\/\/|#)(.*)$/gm;
      for (const match of file.text.matchAll(commentPattern)) {
        model.comments.push({ text: match[1].trim(), evidence: evidenceAt(file, match.index ?? 0, "php") });
      }
    }

    model.evidence = [...model.dataFields.map((field) => field.evidence), ...model.functionCalls.map((call) => call.evidence), ...model.imports.map((item) => item.evidence)];
    return model;
  }
};

function addDataField(model: NormalizedCodeModel, file: SourceFile, name: string | undefined, index: number): void {
  if (!name) return;
  const evidence = evidenceAt(file, index, "php");
  model.dataFields.push({ name, evidence });
  model.symbols.push({ name, kind: "property", evidence });
}

function parameterNames(text: string): string[] {
  return [...text.matchAll(/\$([A-Za-z_][\w]*)/g)].map((match) => match[1]);
}

function quotedNames(text: string): string[] {
  return [...text.matchAll(/["']([A-Za-z_][\w-]*)["']/g)].map((match) => match[1]);
}
