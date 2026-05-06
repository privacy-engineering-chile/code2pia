import path from "node:path";
import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import type { LanguageAdapter, SourceFile } from "./types.js";

const ignores = [
  "**/node_modules/**",
  "**/vendor/**",
  "**/target/**",
  "**/bin/**",
  "**/obj/**",
  "**/.vs/**",
  "**/packages/**",
  "**/build/**",
  "**/dist/**",
  "**/.git/**",
  "**/coverage/**",
  "**/__pycache__/**",
  "**/.next/**",
  "**/*.d.ts"
];

export async function collectSourceFiles(rootPath: string, adapters: LanguageAdapter[]): Promise<SourceFile[]> {
  const extensions = [...new Set(adapters.flatMap((adapter) => adapter.supportedExtensions))];
  const patterns = extensions.map((extension) => `**/*${extension}`);
  const entries = await fg(patterns, {
    cwd: rootPath,
    absolute: true,
    onlyFiles: true,
    ignore: ignores,
    dot: true
  });

  return Promise.all(
    entries.map(async (entry) => ({
      path: path.resolve(entry),
      text: await readFile(entry, "utf8")
    }))
  );
}

export function filesForAdapter(files: SourceFile[], adapter: LanguageAdapter): SourceFile[] {
  return files
    .filter((file) => adapter.supportedExtensions.some((extension) => file.path.endsWith(extension)))
    .map((file) => ({ ...file, language: adapter.id }));
}
