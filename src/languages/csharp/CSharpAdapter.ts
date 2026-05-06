import type { LanguageAdapter, NormalizedCodeModel, SourceFile } from "../../core/scan/types.js";
import { evidenceAt } from "../shared/text.js";

export class CSharpAdapter implements LanguageAdapter {
  id = "csharp";
  name = "C#";
  supportedExtensions = [".cs"];

  parse(files: SourceFile[]): NormalizedCodeModel {
    const model: NormalizedCodeModel = {
      files,
      languages: ["csharp"],
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
      parseTypes(file, model);
      parseParameters(file, model);
      parseCalls(file, model);
      parseImports(file, model);
      parseComments(file, model);
    }

    model.evidence = [
      ...model.dataFields.map((field) => field.evidence),
      ...model.functionCalls.map((call) => call.evidence),
      ...model.imports.map((item) => item.evidence)
    ];
    return model;
  }
}

function parseTypes(file: SourceFile, model: NormalizedCodeModel): void {
  const typePattern = /\b(?:public|internal|private|protected)?\s*(?:partial\s+)?(?:class|record|struct)\s+([A-Za-z_][\w]*)\s*(?:\(([^)]*)\))?/g;
  for (const match of file.text.matchAll(typePattern)) {
    const evidence = evidenceAt(file, match.index ?? 0, "csharp");
    model.symbols.push({ name: match[1], kind: "class", evidence });
    for (const name of parameterNames(match[2] ?? "")) addDataField(model, file, name, match.index ?? 0, match[1]);
  }

  const propertyPattern = /^\s*(?:\[[^\]]+\]\s*)*(?:public|private|protected|internal)?\s*(?:static\s+|virtual\s+|override\s+|required\s+|readonly\s+|init\s+)*[A-Za-z_][\w<>,?.\[\]\s]*\s+([A-Za-z_][\w]*)\s*\{\s*(?:get|set|init)\b[\s\S]*?\}/gm;
  for (const match of file.text.matchAll(propertyPattern)) addDataField(model, file, match[1], match.index ?? 0, nearestContainer(file.text, match.index ?? 0));

  const fieldPattern = /^\s*(?:\[[^\]]+\]\s*)*(?:public|private|protected|internal)?\s*(?:static\s+|readonly\s+|const\s+)?[A-Za-z_][\w<>,?.\[\]\s]*\s+([A-Za-z_][\w]*)\s*(?:=|;)/gm;
  for (const match of file.text.matchAll(fieldPattern)) addDataField(model, file, match[1], match.index ?? 0, nearestContainer(file.text, match.index ?? 0));

  const dbSetPattern = /\bDbSet\s*<\s*([A-Za-z_][\w]*)\s*>\s+([A-Za-z_][\w]*)\s*\{/g;
  for (const match of file.text.matchAll(dbSetPattern)) {
    addDataField(model, file, match[1], match.index ?? 0, "DbContext");
    addDataField(model, file, match[2], match.index ?? 0, "DbContext");
  }
}

function parseParameters(file: SourceFile, model: NormalizedCodeModel): void {
  const methodPattern = /\b(?:public|private|protected|internal)?\s*(?:async\s+|static\s+|virtual\s+|override\s+)*[A-Za-z_][\w<>,?.\[\]\s]*\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)/g;
  for (const match of file.text.matchAll(methodPattern)) {
    const evidence = evidenceAt(file, match.index ?? 0, "csharp");
    model.symbols.push({ name: match[1], kind: "function", evidence });
    for (const name of parameterNames(match[2])) addDataField(model, file, name, match.index ?? 0);
  }

  const bindingPattern = /\[(?:FromBody|FromQuery|FromRoute|FromForm|FromHeader)\]\s*(?:[A-Za-z_][\w<>,?.\[\]]+\s+)?([A-Za-z_][\w]*)/g;
  for (const match of file.text.matchAll(bindingPattern)) addDataField(model, file, match[1], match.index ?? 0);
}

function parseCalls(file: SourceFile, model: NormalizedCodeModel): void {
  const envPattern = /\bEnvironment\.GetEnvironmentVariable\(\s*"([A-Za-z0-9_:.-]+)"/g;
  for (const match of file.text.matchAll(envPattern)) addDataField(model, file, match[1], match.index ?? 0);

  const configPattern = /\b(?:_?configuration|Configuration)\s*\[\s*"([A-Za-z0-9_:.-]+)"\s*\]/g;
  for (const match of file.text.matchAll(configPattern)) addDataField(model, file, lastConfigSegment(match[1]), match.index ?? 0);

  const callPattern = /\b([A-Za-z_][\w]*(?:(?:\.|->)[A-Za-z_][\w]*)*)\s*\(([\s\S]*?)\)/g;
  for (const match of file.text.matchAll(callPattern)) {
    const call = { name: match[1], args: match[2], evidence: evidenceAt(file, match.index ?? 0, "csharp") };
    model.functionCalls.push(call);
    if (isLoggingCall(call.name)) model.loggingCalls.push(call);
    if (isExternalCall(call.name, call.args)) model.externalCalls.push(call);
  }
}

function parseImports(file: SourceFile, model: NormalizedCodeModel): void {
  const usingPattern = /^\s*using\s+([^;]+);/gm;
  for (const match of file.text.matchAll(usingPattern)) {
    model.imports.push({ source: match[1].trim(), specifiers: [], evidence: evidenceAt(file, match.index ?? 0, "csharp") });
  }
}

function parseComments(file: SourceFile, model: NormalizedCodeModel): void {
  const commentPattern = /\/\/(.*)|\/\*([\s\S]*?)\*\//g;
  for (const match of file.text.matchAll(commentPattern)) {
    model.comments.push({ text: (match[1] ?? match[2] ?? "").trim(), evidence: evidenceAt(file, match.index ?? 0, "csharp") });
  }
}

function addDataField(model: NormalizedCodeModel, file: SourceFile, name: string | undefined, index: number, container?: string): void {
  if (!name || ignoredNames.has(name)) return;
  const evidence = evidenceAt(file, index, "csharp");
  model.dataFields.push({ name, container, evidence });
  model.symbols.push({ name, kind: "property", evidence });
}

function parameterNames(text: string): string[] {
  return text
    .split(",")
    .map((part) =>
      part
        .replace(/\[[^\]]+\]/g, "")
        .trim()
        .match(/(?:params\s+)?(?:[A-Za-z_][\w<>,?.\[\]]+\s+)+([A-Za-z_][\w]*)\s*(?:=.*)?$/)?.[1]
    )
    .filter((value): value is string => Boolean(value));
}

function nearestContainer(text: string, index: number): string | undefined {
  const before = text.slice(0, index);
  const matches = [...before.matchAll(/\b(?:class|record|struct)\s+([A-Za-z_][\w]*)/g)];
  return matches.at(-1)?.[1];
}

function isLoggingCall(name: string): boolean {
  return /(^|\.)(LogInformation|LogDebug|LogWarning|LogError|WriteLine|Information|Debug|Warning|Error)$/.test(name);
}

function isExternalCall(name: string, args: string): boolean {
  return (
    /(HttpClient|RestClient|WebClient|RestSharp)/.test(name) ||
    /(^|\.)(GetAsync|PostAsync|PutAsync|PatchAsync|DeleteAsync|SendAsync|ExecuteAsync|DownloadString|UploadString|OpenRead)$/.test(name) ||
    /https?:\/\//i.test(args)
  );
}

function lastConfigSegment(value: string): string {
  return value.split(":").at(-1) ?? value;
}

const ignoredNames = new Set(["get", "set", "init", "return", "var", "new", "Task", "IActionResult", "ActionResult"]);
