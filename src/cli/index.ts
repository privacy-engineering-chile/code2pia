#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { runCode2PiaScan, type Code2PiaReport } from "../core/scan/engine.js";
import { renderJson } from "../outputs/json/index.js";
import { renderDpiaMarkdown, renderPiaMarkdown } from "../outputs/markdown/index.js";
import { renderRatCsv, renderRatMarkdown } from "../outputs/rat/index.js";
import type { RiskLevel } from "../core/types.js";

const program = new Command();

program
  .name("code2pia")
  .description("Privacy as Code CLI: scan TypeScript/JavaScript repositories and generate PIA/DPIA drafts.")
  .version("0.1.0");

program
  .command("scan")
  .argument("<path>", "Repository or directory to scan")
  .option("--jurisdiction <id>", "Jurisdiction pack to apply", "CL-LEY-21719")
  .option("--profile <profile>", "Legal/privacy profile to apply: generic or chile-21719", "generic")
  .option("--evidence <file>", "JSON evidence file relative to the scan path, for example privacy/activities.json")
  .option("--privacy-file <file>", "Privacy declaration YAML file, defaults to code2pia.privacy.yaml")
  .option("--json <file>", "Write JSON report to a file")
  .option("--markdown <file>", "Write Markdown PIA draft to a file")
  .option("--ropa <file>", "Write ROPA draft JSON to a file")
  .option("--rat <file>", "Write Chilean RAT draft JSON to a file")
  .option("--rat-markdown <file>", "Write Chilean RAT draft Markdown table to a file")
  .option("--rat-csv <file>", "Write Chilean RAT draft CSV to a file")
  .option("--dpia <file>", "Write DPIA/EIPD draft Markdown to a file")
  .option("--format <format>", "Stdout format when no output file is requested: summary or json", "summary")
  .option("--fail-on <threshold>", "Exit with code 2 when risk reaches low, medium, high, or eipd-required")
  .description("Scan a codebase for personal data, privacy risks, and basic data flows")
  .action(async (targetPath: string, options: { jurisdiction: string; profile: string; evidence?: string; privacyFile?: string; json?: string; markdown?: string; ropa?: string; rat?: string; ratMarkdown?: string; ratCsv?: string; dpia?: string; format: string; failOn?: string }) => {
    try {
      const jurisdiction = options.jurisdiction ?? (options.profile === "chile-21719" ? "CL-LEY-21719" : "CL-LEY-21719");
      const report = await runCode2PiaScan(targetPath, { jurisdiction, privacyFile: options.privacyFile ?? options.evidence });

      if (options.json) {
        await writeOutput(options.json, renderJson(report));
      }

      if (options.markdown) {
        await writeOutput(options.markdown, renderPiaMarkdown(report));
      }

      if (options.ropa) {
        await writeOutput(options.ropa, `${JSON.stringify(report.ropaDraft, null, 2)}\n`);
      }

      if (options.rat) {
        await writeOutput(options.rat, `${JSON.stringify(requireRat(report), null, 2)}\n`);
      }

      if (options.ratMarkdown) {
        await writeOutput(options.ratMarkdown, renderRatMarkdown(requireRat(report)));
      }

      if (options.ratCsv) {
        await writeOutput(options.ratCsv, renderRatCsv(requireRat(report)));
      }

      if (options.dpia) {
        await writeOutput(options.dpia, renderDpiaMarkdown(report.dpiaDraft));
      }

      if (!options.json && !options.markdown && !options.ropa && !options.rat && !options.ratMarkdown && !options.ratCsv && !options.dpia) {
        process.stdout.write(options.format === "json" ? renderJson(report) : renderSummary(report));
      } else {
        process.stdout.write(renderSummary(report));
      }

      if (shouldFail(report, options.failOn)) {
        process.exitCode = 2;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`code2pia failed: ${message}\n`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);

async function writeOutput(filePath: string, contents: string): Promise<void> {
  const absolutePath = path.resolve(filePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents, "utf8");
}

function requireRat(report: Code2PiaReport) {
  if (!report.ratDraft) {
    throw new Error("Selected jurisdiction does not provide a RAT draft output.");
  }
  return report.ratDraft;
}

function shouldFail(report: Code2PiaReport, failOn?: string): boolean {
  if (!failOn) {
    return false;
  }

  if (failOn === "eipd-required") {
    return report.dpiaTriggerAssessment.required === true;
  }

  if (!["low", "medium", "high"].includes(failOn)) {
    throw new Error(`Unsupported --fail-on value "${failOn}". Use low, medium, high, or eipd-required.`);
  }

  const levels: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };
  return levels[report.scanResult.risk] >= levels[failOn as RiskLevel];
}

function renderSummary(report: Code2PiaReport): string {
  return `${[
    "code2pia scan complete",
    "",
    `Jurisdiction: ${report.jurisdictionAssessment.jurisdiction} / ${report.jurisdictionAssessment.lawName}`,
    `Risk score: ${report.scanResult.risk.toUpperCase()}`,
    `DPIA/EIPD trigger: ${String(report.dpiaTriggerAssessment.required)} (${report.dpiaTriggerAssessment.confidence})`,
    "",
    `Files scanned: ${report.scan.filesScanned}`,
    `Languages: ${report.scan.languagesDetected.join(", ") || "none"}`,
    `Personal data: ${report.scanResult.personalData.map((item) => item.field).join(", ") || "none detected"}`,
    `Findings: ${report.scanResult.findings.length}`,
    `Gaps: ${report.gaps.length}`,
    "",
    report.disclaimer
  ].join("\n")}\n`;
}
