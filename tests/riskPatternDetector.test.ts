import { describe, expect, it } from "vitest";
import { computeLineStarts } from "../src/core/source.js";
import { riskPatternDetector } from "../src/detectors/riskPatternDetector.js";

describe("riskPatternDetector", () => {
  it("detects logging of personal data", () => {
    const text = "console.log(user.email, user.rut);";
    const result = riskPatternDetector.run({
      rootPath: "/repo",
      files: [{ path: "/repo/users.ts", text, lineStarts: computeLineStarts(text) }]
    });

    expect(result.risks?.some((risk) => risk.id === "logging-personal-data")).toBe(true);
  });

  it("detects analytics libraries", () => {
    const text = 'import posthog from "posthog-js";';
    const result = riskPatternDetector.run({
      rootPath: "/repo",
      files: [{ path: "/repo/analytics.ts", text, lineStarts: computeLineStarts(text) }]
    });

    expect(result.risks?.some((risk) => risk.id === "analytics-tracking-library")).toBe(true);
  });
});
