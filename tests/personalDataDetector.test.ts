import { describe, expect, it } from "vitest";
import { computeLineStarts } from "../src/core/source.js";
import { personalDataDetector } from "../src/detectors/personalDataDetector.js";

describe("personalDataDetector", () => {
  it("detects personal data fields in interfaces", () => {
    const text = `interface UserDto {
  rut: string;
  email: string;
  healthCondition: string;
}`;

    const result = personalDataDetector.run({
      rootPath: "/repo",
      files: [{ path: "/repo/user.dto.ts", text, lineStarts: computeLineStarts(text) }]
    });

    expect(result.personalData?.map((finding) => finding.category)).toEqual(expect.arrayContaining(["rut", "email", "health"]));
  });

  it("detects personal data in environment variable keys", () => {
    const text = "SUPPORT_EMAIL=privacy@example.com\n";
    const result = personalDataDetector.run({
      rootPath: "/repo",
      files: [{ path: "/repo/.env", text, lineStarts: computeLineStarts(text) }]
    });

    expect(result.personalData?.[0]?.category).toBe("email");
  });

  it("detects Chile Law 21.719 sensitive data categories", () => {
    const text = `interface SensitiveProfile {
  biometricTemplate: string;
  religion: string;
  politicalAffiliation: string;
  sexualOrientation: string;
  genderIdentity: string;
  socioeconomicStatus: string;
}`;

    const result = personalDataDetector.run({
      rootPath: "/repo",
      files: [{ path: "/repo/sensitive.ts", text, lineStarts: computeLineStarts(text) }]
    });

    expect(result.personalData?.map((finding) => finding.category)).toEqual(
      expect.arrayContaining(["biometric", "religion", "politicalAffiliation", "sexualOrientation", "genderIdentity", "socioeconomic"])
    );
    expect(result.personalData?.every((finding) => finding.sensitivity === "high")).toBe(true);
  });
});
