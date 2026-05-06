import { classifyPersonalData } from "./personalDataDictionary.js";
import { getCallExpressions, locationFromIndex } from "../core/source.js";
import type { DataFlow, Detector, PersonalDataCategory } from "../core/types.js";

export const dataFlowDetector: Detector = {
  id: "data-flow",
  run(context) {
    const dataFlows: DataFlow[] = [];

    for (const file of context.files) {
      const fileRole = inferFileRole(file.path);

      for (const call of getCallExpressions(file.text, ["fetch", "axios.post", "axios.put", "axios.patch", "axios", "api.post"])) {
        const personalData = categoriesInText(call.args);
        const leavesSystem = /https?:\/\//i.test(call.args) || /process\.env\.[A-Z0-9_]*(API|URL|HOST|ENDPOINT)/.test(call.args);
        const to = leavesSystem ? "external service" : fileRole === "frontend" ? "API" : "service";

        if (personalData.length === 0 && !leavesSystem) {
          continue;
        }

        dataFlows.push({
          from: fileRole,
          to,
          personalData,
          leavesSystem,
          evidence: call.evidence,
          location: locationFromIndex(file, call.index)
        });
      }
    }

    return { dataFlows };
  }
};

function inferFileRole(filePath: string): string {
  const segments = filePath.toLowerCase().split(/[\\/]+/);
  if (segments.some((segment) => ["api", "routes", "route", "controllers", "controller", "server"].includes(segment))) {
    return "API";
  }

  if (segments.some((segment) => ["services", "service", "adapters", "adapter", "integrations", "integration", "providers", "provider"].includes(segment))) {
    return "service";
  }

  if (segments.some((segment) => ["client", "frontend", "components", "pages", "app"].includes(segment)) || /\.(tsx|jsx)$/.test(filePath)) {
    return "frontend";
  }

  return "application";
}

function categoriesInText(text: string): PersonalDataCategory[] {
  const categories = new Set<PersonalDataCategory>();
  for (const token of text.split(/[^A-Za-z0-9_$-]+/)) {
    const rule = classifyPersonalData(token);
    if (rule) {
      categories.add(rule.category);
    }
  }
  return [...categories];
}
