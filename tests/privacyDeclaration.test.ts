import { describe, expect, it } from "vitest";
import { PrivacyDeclarationSchema } from "../src/declarations/schema.js";

describe("privacy declaration validation", () => {
  it("validates code2pia.privacy.yaml shape", () => {
    const declaration = PrivacyDeclarationSchema.parse({
      jurisdiction: "CL-LEY-21719",
      service: "customer-api",
      processingActivities: [
        {
          id: "customer_registration",
          name: "Customer registration",
          purpose: "Register customers.",
          lawfulBasis: "Contract execution",
          dataSubjects: ["customers"],
          personalData: ["rut", "email"],
          retention: "Account lifetime",
          processors: [],
          recipients: [],
          internationalTransfers: [],
          securityMeasures: ["TLS"],
          dpia: { assessed: false }
        }
      ]
    });

    expect(declaration.processingActivities[0]?.id).toBe("customer_registration");
  });
});
