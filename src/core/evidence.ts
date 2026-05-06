import path from "node:path";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { SourceFileContext } from "./types.js";

export const EvidenceActivitySchema = z.object({
  name: z.string(),
  purpose: z.string(),
  lawfulBasis: z.string(),
  dataSubjects: z.array(z.string()).default([]),
  retention: z.string().optional(),
  fields: z.record(z.object({ necessity: z.string().optional() })).default({})
});

export const EvidenceFileSchema = z.object({
  activities: z.record(EvidenceActivitySchema)
});

export type EvidenceActivity = z.infer<typeof EvidenceActivitySchema>;
export type EvidenceFile = z.infer<typeof EvidenceFileSchema>;

export interface ActivityReference {
  key: string;
  file: string;
  line: number;
  evidence: string;
}

export async function loadEvidenceFile(rootPath: string, evidencePath?: string): Promise<EvidenceFile | undefined> {
  if (!evidencePath) {
    return undefined;
  }

  const absolutePath = path.resolve(rootPath, evidencePath);
  const contents = await readFile(absolutePath, "utf8");
  return EvidenceFileSchema.parse(JSON.parse(contents));
}

export function findActivityReference(files: SourceFileContext[]): ActivityReference | undefined {
  for (const file of files) {
    const match = file.text.match(/\bprivacyActivity\s*=\s*["'`]([A-Za-z0-9_.:-]+)["'`]/);
    if (!match || match.index === undefined) {
      continue;
    }

    return {
      key: match[1],
      file: file.path,
      line: lineFromIndex(file, match.index),
      evidence: lineAt(file.text, match.index)
    };
  }

  return undefined;
}

function lineFromIndex(file: SourceFileContext, index: number): number {
  let line = 1;
  for (const start of file.lineStarts) {
    if (start <= index) {
      line += 1;
    }
  }
  return Math.max(1, line - 1);
}

function lineAt(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  const nextNewline = text.indexOf("\n", index);
  const end = nextNewline === -1 ? text.length : nextNewline;
  return text.slice(start, end).trim();
}
