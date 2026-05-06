import path from "node:path";
import { readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import fg from "fast-glob";
import { Project, SyntaxKind } from "ts-morph";
import type { SourceFileContext, SourceLocation } from "./types.js";

const DEFAULT_IGNORES = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/coverage/**",
  "**/*.d.ts"
];

export async function collectSourceFiles(rootPath: string): Promise<SourceFileContext[]> {
  const absoluteRoot = path.resolve(rootPath);
  const rootStat = await stat(absoluteRoot).catch(() => undefined);
  if (!rootStat) {
    throw new Error(`Scan path does not exist: ${absoluteRoot}`);
  }

  if (!rootStat.isDirectory()) {
    throw new Error(`Scan path must be a directory: ${absoluteRoot}`);
  }

  const entries = await fg(["**/*.{ts,tsx,js,jsx,mjs,cjs}", "**/.env", "**/.env.*"], {
    cwd: absoluteRoot,
    absolute: true,
    onlyFiles: true,
    ignore: DEFAULT_IGNORES,
    dot: true
  });

  const project = new Project({
    compilerOptions: {
      allowJs: true,
      checkJs: false,
      skipLibCheck: true
    },
    skipAddingFilesFromTsConfig: true
  });

  const sourceFiles = project.addSourceFilesAtPaths(entries.filter((entry) => /\.[cm]?[jt]sx?$/.test(entry)));
  const tsMorphFiles = new Map(sourceFiles.map((file) => [path.resolve(file.getFilePath()), file]));

  return entries.map((entry) => {
    const sourceFile = tsMorphFiles.get(path.resolve(entry));
    const text = sourceFile?.getFullText() ?? safeReadFile(entry);
    return {
      path: entry,
      text,
      lineStarts: computeLineStarts(text)
    };
  });
}

export function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      starts.push(index + 1);
    }
  }
  return starts;
}

export function locationFromIndex(file: SourceFileContext, index: number): SourceLocation {
  let lineIndex = 0;
  for (let i = 0; i < file.lineStarts.length; i += 1) {
    if (file.lineStarts[i] <= index) {
      lineIndex = i;
    } else {
      break;
    }
  }

  return {
    file: file.path,
    line: lineIndex + 1,
    column: index - file.lineStarts[lineIndex]
  };
}

export function getPropertyLikeIdentifiers(text: string): Array<{ name: string; index: number; evidence: string }> {
  const matches: Array<{ name: string; index: number; evidence: string }> = [];
  const propertyPattern =
    /(?:^|[\s{,(]|interface|type|class|schema|model|const|let|var|export|public|private|protected|readonly)\s*([A-Za-z_$][\w$-]*)\s*(?:\??\s*:|=|\))/gm;

  for (const match of text.matchAll(propertyPattern)) {
    const name = match[1];
    const index = match.index + match[0].lastIndexOf(name);
    matches.push({ name, index, evidence: lineAt(text, index) });
  }

  return matches;
}

export function getStringLiteralValues(text: string): Array<{ value: string; index: number; evidence: string }> {
  const values: Array<{ value: string; index: number; evidence: string }> = [];
  const stringPattern = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g;

  for (const match of text.matchAll(stringPattern)) {
    const value = match[2];
    values.push({
      value,
      index: match.index,
      evidence: lineAt(text, match.index)
    });
  }

  return values;
}

export function getCallExpressions(text: string, callNames: string[]): Array<{ call: string; args: string; index: number; evidence: string }> {
  const escaped = callNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const callPattern = new RegExp(`\\b(${escaped})\\s*\\(([\\s\\S]*?)\\)`, "g");
  const calls: Array<{ call: string; args: string; index: number; evidence: string }> = [];

  for (const match of text.matchAll(callPattern)) {
    calls.push({
      call: match[1],
      args: match[2],
      index: match.index,
      evidence: lineAt(text, match.index)
    });
  }

  return calls;
}

export function lineAt(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  const nextNewline = text.indexOf("\n", index);
  const end = nextNewline === -1 ? text.length : nextNewline;
  return text.slice(start, end).trim();
}

function safeReadFile(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

export function isEnvFile(filePath: string): boolean {
  return path.basename(filePath).startsWith(".env");
}

export function syntaxKindName(kind: SyntaxKind): string {
  return SyntaxKind[kind] ?? String(kind);
}
