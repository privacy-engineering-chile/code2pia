import type { Code2PiaReport } from "../../core/scan/engine.js";

export function renderJson(report: Code2PiaReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
