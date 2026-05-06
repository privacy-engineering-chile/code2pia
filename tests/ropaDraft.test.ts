import { describe, expect, it } from "vitest";
import { runCode2PiaScan } from "../src/core/scan/engine.js";

describe("ROPA draft generation", () => {
  it("uses privacy declaration activities when available", async () => {
    const report = await runCode2PiaScan("examples/evidence-app", {
      jurisdiction: "CL-LEY-21719",
      privacyFile: "code2pia.privacy.yaml"
    });

    expect(report.ropaDraft.lawName).toBe("Ley 21.719");
    expect(report.ropaDraft.activities[0]?.id).toBe("customer_registration");
    expect(report.ropaDraft.activities[0]?.personalData).toEqual(expect.arrayContaining(["rut", "email"]));
  });
});
