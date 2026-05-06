import { z } from "zod";

export const PrivacyDeclarationSchema = z.object({
  jurisdiction: z
    .union([
      z.string(),
      z.object({
        id: z.string()
      })
    ])
    .transform((value) => (typeof value === "string" ? value : value.id)),
  service: z.string(),
  owner: z.string().optional(),
  controller: z.string().optional(),
  processingActivities: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      activityName: z.string().optional(),
      role: z.enum(["Responsable", "Encargado"]).optional(),
      purpose: z.string().optional(),
      lawfulBasis: z.string().optional(),
      lawfulBasisOrLegitimateInterest: z.string().optional(),
      dataSubjects: z.array(z.string()).default([]),
      dataSubjectUniverse: z.array(z.string()).default([]),
      personalData: z.array(z.string()).default([]),
      sensitiveData: z.array(z.string()).default([]),
      retention: z.string().optional(),
      retentionPeriod: z.string().optional(),
      processors: z.array(z.string()).default([]),
      recipients: z.array(z.string()).default([]),
      expectedRecipients: z.array(z.string()).default([]),
      dataSource: z.array(z.string()).default([]),
      internationalTransfers: z
        .array(
          z.object({
            recipient: z.string(),
            country: z.string().optional(),
            safeguard: z.string().optional()
          })
        )
        .default([]),
      securityMeasures: z.array(z.string()).default([]),
      dpia: z
        .object({
          assessed: z.boolean().default(false),
          required: z.boolean().optional(),
          summary: z.string().optional()
        })
        .default({ assessed: false })
    })
  )
});

export type PrivacyDeclaration = z.infer<typeof PrivacyDeclarationSchema>;
