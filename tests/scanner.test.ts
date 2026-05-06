import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/core/scanner.js";

describe("scanRepository", () => {
  it("fails clearly when the scan path does not exist", async () => {
    await expect(scanRepository("/definitely/not/a/real/code2pia/path")).rejects.toThrow("Scan path does not exist");
  });
});
