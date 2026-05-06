import path from "node:path";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { PrivacyDeclarationSchema, type PrivacyDeclaration } from "./schema.js";

export async function loadPrivacyDeclaration(rootPath: string, privacyFile?: string): Promise<PrivacyDeclaration | undefined> {
  const filePath = privacyFile ?? "code2pia.privacy.yaml";
  const absolutePath = path.resolve(rootPath, filePath);
  const contents = await readFile(absolutePath, "utf8").catch(() => undefined);
  if (!contents) {
    return undefined;
  }

  return PrivacyDeclarationSchema.parse(parse(contents));
}
