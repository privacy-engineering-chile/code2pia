import { describe, expect, it } from "vitest";
import { runCode2PiaScan } from "../src/core/scan/engine.js";
import { mapRatDataCategories } from "../src/jurisdictions/cl-ley-21719/rat.js";
import { renderRatCsv, renderRatMarkdown, ratColumns } from "../src/outputs/rat/index.js";
import type { PersonalDataDetection } from "../src/core/scan/types.js";

const evidence = [{ file: "/repo/a.ts", line: 1, column: 0, snippet: "rut: string" }];

describe("Chile RAT draft", () => {
  it("maps detected fields to Chilean RAT data categories", () => {
    const personalData: PersonalDataDetection[] = [
      { field: "rut", category: "rut", sensitivity: "high", confidence: 0.9, evidence },
      { field: "email", category: "email", sensitivity: "medium", confidence: 0.9, evidence },
      { field: "healthCondition", category: "health", sensitivity: "high", confidence: 0.9, evidence },
      { field: "latitude", category: "location", sensitivity: "medium", confidence: 0.9, evidence }
    ];

    const categories = mapRatDataCategories(personalData);

    expect(categories.map((item) => item.category)).toEqual(
      expect.arrayContaining(["Datos identificatorios", "Datos de contacto", "Datos sensibles / datos de salud", "Datos de ubicación"])
    );
  });

  it("generates RAT schema records from declaration evidence", async () => {
    const report = await runCode2PiaScan("examples/evidence-app", {
      jurisdiction: "CL-LEY-21719",
      privacyFile: "code2pia.privacy.yaml"
    });

    expect(report.ratDraft?.law).toBe("Ley 21.719");
    expect(report.ratDraft?.records[0]?.role).toBe("Responsable");
    expect(report.ratDraft?.records[0]?.gaps).toEqual([]);
  });

  it("detects RAT gaps when declaration evidence is missing", async () => {
    const report = await runCode2PiaScan("examples/high-app", { jurisdiction: "CL-LEY-21719" });

    expect(report.ratDraft?.records[0]?.gaps).toEqual(
      expect.arrayContaining(["missing_role", "missing_purpose", "missing_lawful_basis", "missing_retention_period", "missing_data_source"])
    );
  });

  it("renders the RAT Markdown table with exact Chilean columns", async () => {
    const report = await runCode2PiaScan("examples/evidence-app", {
      jurisdiction: "CL-LEY-21719",
      privacyFile: "code2pia.privacy.yaml"
    });

    const markdown = renderRatMarkdown(report.ratDraft!);
    expect(markdown.split("\n")[0]).toBe(`| ${ratColumns.join(" | ")} |`);
  });

  it("renders the RAT CSV with exact Chilean columns", async () => {
    const report = await runCode2PiaScan("examples/evidence-app", {
      jurisdiction: "CL-LEY-21719",
      privacyFile: "code2pia.privacy.yaml"
    });

    const csv = renderRatCsv(report.ratDraft!);
    expect(csv.split("\n")[0]).toBe(ratColumns.join(","));
  });
});
