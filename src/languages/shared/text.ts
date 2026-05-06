import type { NormalizedEvidence, SourceFile } from "../../core/scan/types.js";

export function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      starts.push(index + 1);
    }
  }
  return starts;
}

export function evidenceAt(file: SourceFile, index: number, language = file.language ?? "unknown"): NormalizedEvidence {
  const lineStarts = computeLineStarts(file.text);
  let lineIndex = 0;
  for (let i = 0; i < lineStarts.length; i += 1) {
    if (lineStarts[i] <= index) {
      lineIndex = i;
    } else {
      break;
    }
  }

  return {
    file: file.path,
    line: lineIndex + 1,
    column: index - lineStarts[lineIndex],
    snippet: lineAt(file.text, index),
    language
  };
}

export function lineAt(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  const nextNewline = text.indexOf("\n", index);
  const end = nextNewline === -1 ? text.length : nextNewline;
  return text.slice(start, end).trim();
}

export function mergeModels<T extends { files: SourceFile[]; languages: string[]; symbols: unknown[]; dataFields: unknown[]; functionCalls: unknown[]; externalCalls: unknown[]; loggingCalls: unknown[]; imports: unknown[]; comments: unknown[]; evidence: unknown[] }>(
  models: T[]
): T {
  return {
    files: models.flatMap((model) => model.files),
    languages: [...new Set(models.flatMap((model) => model.languages))],
    symbols: models.flatMap((model) => model.symbols),
    dataFields: models.flatMap((model) => model.dataFields),
    functionCalls: models.flatMap((model) => model.functionCalls),
    externalCalls: models.flatMap((model) => model.externalCalls),
    loggingCalls: models.flatMap((model) => model.loggingCalls),
    imports: models.flatMap((model) => model.imports),
    comments: models.flatMap((model) => model.comments),
    evidence: models.flatMap((model) => model.evidence)
  } as T;
}
