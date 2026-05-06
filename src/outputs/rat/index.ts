import type { RatDraft, RatRecord } from "../../jurisdictions/types.js";

export const ratColumns = [
  "Actividad de tratamiento",
  "Responsable o encargado",
  "Categoría de datos",
  "Universo de titulares",
  "Finalidad",
  "Base de legitimidad/interés legítimo",
  "Destinatarios previstos",
  "Período de conservación",
  "Fuente de la cual provienen los datos"
];

export function renderRatMarkdown(ratDraft: RatDraft): string {
  return [
    "| " + ratColumns.join(" | ") + " |",
    "| " + ratColumns.map(() => "---").join(" | ") + " |",
    ...ratDraft.records.map((record) => "| " + ratRow(record).map(escapeMarkdownCell).join(" | ") + " |")
  ].join("\n") + "\n";
}

export function renderRatCsv(ratDraft: RatDraft): string {
  return [ratColumns, ...ratDraft.records.map(ratRow)].map((row) => row.map(escapeCsvCell).join(",")).join("\n") + "\n";
}

function ratRow(record: RatRecord): string[] {
  return [
    record.activityName,
    record.role,
    record.dataCategories.map((category) => `${category.category}: ${category.items.join("; ")}`).join("\n"),
    record.dataSubjectUniverse.join("; ") || "unknown",
    record.purpose,
    record.lawfulBasisOrLegitimateInterest,
    record.expectedRecipients.join("; ") || "unknown",
    record.retentionPeriod,
    record.dataSource.join("; ") || "unknown"
  ];
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function escapeCsvCell(value: string): string {
  const escaped = value.replace(/"/g, "\"\"");
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}
