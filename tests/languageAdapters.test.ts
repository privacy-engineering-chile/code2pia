import { describe, expect, it } from "vitest";
import { pythonAdapter } from "../src/languages/python/index.js";
import { typescriptAdapter } from "../src/languages/typescript/index.js";

describe("language adapters", () => {
  it("exposes the common adapter interface", () => {
    expect(typescriptAdapter.id).toBe("typescript");
    expect(typescriptAdapter.supportedExtensions).toContain(".ts");
    expect(typeof typescriptAdapter.parse).toBe("function");
    expect(pythonAdapter.id).toBe("python");
    expect(pythonAdapter.supportedExtensions).toContain(".py");
  });

  it("normalizes TypeScript fields, calls, imports and logging calls", () => {
    const model = typescriptAdapter.parse([
      {
        path: "/repo/customer.ts",
        text: `import posthog from "posthog-js";
interface Customer { email: string; rut: string; }
console.log(customer.email);
fetch("https://api.example.com", { body: JSON.stringify({ email: customer.email }) });`
      }
    ]);

    expect(model.dataFields.map((field) => field.name)).toEqual(expect.arrayContaining(["email", "rut"]));
    expect(model.imports[0]?.source).toBe("posthog-js");
    expect(model.loggingCalls[0]?.name).toBe("console.log");
    expect(model.externalCalls.length).toBeGreaterThan(0);
  });
});
