import { describe, expect, it } from "vitest";
import { chileLey21719Pack } from "../src/jurisdictions/cl-ley-21719/index.js";

describe("jurisdiction pack interface", () => {
  it("implements the common pack contract", () => {
    expect(chileLey21719Pack.id).toBe("CL-LEY-21719");
    expect(chileLey21719Pack.country).toBe("CL");
    expect(typeof chileLey21719Pack.evaluate).toBe("function");
    expect(typeof chileLey21719Pack.generateRopaDraft).toBe("function");
    expect(typeof chileLey21719Pack.generateDpiaDraft).toBe("function");
    expect(typeof chileLey21719Pack.evaluateDpiaTriggers).toBe("function");
  });
});
