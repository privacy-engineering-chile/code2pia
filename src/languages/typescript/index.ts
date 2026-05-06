import path from "node:path";
import {
  Node,
  Project,
  SyntaxKind,
  type CallExpression,
  type ImportDeclaration,
  type Node as MorphNode,
  type PropertyDeclaration,
  type PropertySignature,
  type SourceFile as MorphSourceFile,
  type VariableDeclaration
} from "ts-morph";
import type { LanguageAdapter, NormalizedCodeModel, SourceFile } from "../../core/scan/types.js";
import { evidenceAt } from "../shared/text.js";

export const typescriptAdapter: LanguageAdapter = {
  id: "typescript",
  name: "TypeScript / JavaScript",
  supportedExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  parse(files: SourceFile[]): NormalizedCodeModel {
    const model = emptyModel(files, inferLanguages(files));
    const project = new Project({
      compilerOptions: { allowJs: true, checkJs: false, skipLibCheck: true },
      skipAddingFilesFromTsConfig: true
    });

    for (const file of files) {
      const sourceFile = project.createSourceFile(file.path, file.text, { overwrite: true });
      parseFields(file, sourceFile, model);
      parseCalls(file, sourceFile, model);
      parseImports(file, sourceFile, model);
      parseComments(file, model);
    }

    model.evidence = [
      ...model.dataFields.map((field) => field.evidence),
      ...model.functionCalls.map((call) => call.evidence),
      ...model.imports.map((item) => item.evidence)
    ];
    return model;
  }
};

function emptyModel(files: SourceFile[], languages: string[]): NormalizedCodeModel {
  return {
    files,
    languages,
    symbols: [],
    dataFields: [],
    functionCalls: [],
    externalCalls: [],
    loggingCalls: [],
    imports: [],
    comments: [],
    evidence: []
  };
}

function inferLanguages(files: SourceFile[]): string[] {
  const languages = new Set<string>();
  if (files.some((file) => /\.(ts|tsx)$/.test(file.path))) languages.add("typescript");
  if (files.some((file) => /\.(js|jsx|mjs|cjs)$/.test(file.path))) languages.add("javascript");
  return [...languages];
}

function parseFields(file: SourceFile, sourceFile: MorphSourceFile, model: NormalizedCodeModel): void {
  const fieldNodes = sourceFile
    .getDescendants()
    .filter((node): node is PropertySignature | PropertyDeclaration | VariableDeclaration => Node.isPropertySignature(node) || Node.isPropertyDeclaration(node) || Node.isVariableDeclaration(node));

  for (const node of fieldNodes) {
    const name = node.getName();
    const evidence = evidenceAt(file, node.getNameNode().getStart(), languageForFile(file));
    model.dataFields.push({ name, container: containerName(node), evidence });
    model.symbols.push({ name, kind: Node.isVariableDeclaration(node) ? "variable" : "property", evidence });
  }
}

function parseCalls(file: SourceFile, sourceFile: MorphSourceFile, model: NormalizedCodeModel): void {
  const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const node of calls) {
    const name = callName(node);
    const args = node.getArguments().map((arg) => arg.getText()).join(", ");
    const call = {
      name,
      args,
      evidence: evidenceAt(file, node.getStart(), languageForFile(file))
    };
    model.functionCalls.push(call);
    if (/^(console\.(log|info|warn|error)|logger\.(info|debug|warn|error))$/.test(call.name)) model.loggingCalls.push(call);
    if (/^(fetch|axios|axios\.post|axios\.put|axios\.patch|got|request)$/.test(call.name) || /https?:\/\//i.test(call.args)) model.externalCalls.push(call);
  }
}

function parseImports(file: SourceFile, sourceFile: MorphSourceFile, model: NormalizedCodeModel): void {
  for (const node of sourceFile.getImportDeclarations()) {
    model.imports.push({
      source: node.getModuleSpecifierValue(),
      specifiers: importSpecifiers(node),
      evidence: evidenceAt(file, node.getStart(), languageForFile(file))
    });
  }
}

function parseComments(file: SourceFile, model: NormalizedCodeModel): void {
  const commentPattern = /\/\/(.*)|\/\*([\s\S]*?)\*\//g;
  for (const match of file.text.matchAll(commentPattern)) {
    model.comments.push({
      text: (match[1] ?? match[2] ?? "").trim(),
      evidence: evidenceAt(file, match.index ?? 0, languageForFile(file))
    });
  }
}

function callName(node: CallExpression): string {
  return node.getExpression().getText();
}

function importSpecifiers(node: ImportDeclaration): string[] {
  return [
    node.getDefaultImport()?.getText(),
    ...node.getNamedImports().map((item) => item.getName()),
    node.getNamespaceImport()?.getText()
  ].filter((item): item is string => Boolean(item));
}

function containerName(node: MorphNode): string | undefined {
  const parent = node.getFirstAncestor((ancestor) => Node.isClassDeclaration(ancestor) || Node.isInterfaceDeclaration(ancestor) || Node.isTypeAliasDeclaration(ancestor));
  return parent && "getName" in parent ? parent.getName() : undefined;
}

function languageForFile(file: SourceFile): string {
  if (/\.(js|jsx|mjs|cjs)$/.test(path.extname(file.path))) return "javascript";
  return "typescript";
}
