import type { PrivacyDeclaration } from "../../declarations/schema.js";
import type { PersonalDataDetection, ScanResult } from "../../core/scan/types.js";
import type { RatDataCategory, RatDraft, RatRecord } from "../types.js";
import { sensitiveCategories } from "./mappings.js";

const unknown = "unknown";

export function generateRatDraft(scanResult: ScanResult, declaration?: PrivacyDeclaration): RatDraft {
  const activity = declaration?.processingActivities[0];
  const dataCategories = mapRatDataCategories(scanResult.personalData);
  const gaps = ratGaps(scanResult, declaration, dataCategories);

  const record: RatRecord = {
    activityName: activity?.activityName ?? activity?.name ?? unknown,
    role: activity?.role ?? "unknown",
    dataCategories,
    dataSubjectUniverse: activity?.dataSubjectUniverse?.length ? activity.dataSubjectUniverse : activity?.dataSubjects?.length ? activity.dataSubjects : [],
    purpose: activity?.purpose ?? unknown,
    lawfulBasisOrLegitimateInterest: activity?.lawfulBasisOrLegitimateInterest ?? activity?.lawfulBasis ?? unknown,
    expectedRecipients: expectedRecipients(scanResult, activity),
    retentionPeriod: activity?.retentionPeriod ?? activity?.retention ?? unknown,
    dataSource: activity?.dataSource?.length ? activity.dataSource : [],
    sourceEvidence: scanResult.personalData.flatMap((item) => item.evidence),
    reviewStatus: gaps.length > 0 ? "needs_review" : "complete",
    gaps
  };

  return {
    jurisdiction: "CL",
    law: "Ley 21.719",
    generatedAt: new Date().toISOString(),
    records: [record]
  };
}

export function mapRatDataCategories(personalData: PersonalDataDetection[]): RatDataCategory[] {
  const mapped = new Map<string, RatDataCategory>();

  for (const item of personalData) {
    const category = ratCategoryForField(item.field, item.category);
    const current =
      mapped.get(category) ??
      ({
        category,
        items: [],
        detectedFields: [],
        evidence: []
      } satisfies RatDataCategory);

    current.items.push(labelForField(item.field, item.category));
    current.detectedFields.push(item.field);
    current.evidence.push(...item.evidence);
    mapped.set(category, current);
  }

  return [...mapped.values()].map((category) => ({
    ...category,
    items: [...new Set(category.items)],
    detectedFields: [...new Set(category.detectedFields)]
  }));
}

function ratCategoryForField(field: string, category: string): string {
  const normalized = field.toLowerCase();
  if (["rut", "run", "nationalid"].includes(normalized) || category === "rut" || category === "name") return "Datos identificatorios";
  if (["email", "phone", "address"].includes(category)) return "Datos de contacto";
  if (/(ip|useragent|browser|timestamp|eventdate)/i.test(field)) return "Metadatos transaccionales";
  if (["birthDate", "genderIdentity"].includes(category) || /(age|gender)/i.test(field)) return "Datos de características personales";
  if (/(employer|institution|role|jobtitle|department)/i.test(field)) return "Información institucional";
  if (["accountNumber", "socioeconomic"].includes(category) || /(debt|income|bankaccount)/i.test(field)) return "Datos económicos, financieros, bancarios o comerciales";
  if (["health"].includes(category) || /(healthcondition|diagnosis|medicalrecord)/i.test(field)) return "Datos sensibles / datos de salud";
  if (["location"].includes(category) || /(latitude|longitude|geolocation)/i.test(field)) return "Datos de ubicación";
  if (sensitiveCategories.has(category)) return "Datos sensibles";
  return "Otros datos personales";
}

function labelForField(field: string, category: string): string {
  if (category === "rut") return "RUT/RUN";
  if (category === "email") return "Correo electronico";
  if (category === "phone") return "Telefono";
  if (category === "address") return "Direccion";
  if (category === "name") return "Nombre";
  return field;
}

function expectedRecipients(scanResult: ScanResult, activity: PrivacyDeclaration["processingActivities"][number] | undefined): string[] {
  const declared = [...(activity?.expectedRecipients ?? []), ...(activity?.recipients ?? []), ...(activity?.processors ?? [])];
  const detected = scanResult.dataFlows.filter((flow) => flow.externalRecipient).map((flow) => flow.to);
  return [...new Set([...declared, ...detected])];
}

function ratGaps(scanResult: ScanResult, declaration: PrivacyDeclaration | undefined, dataCategories: RatDataCategory[]): string[] {
  const activity = declaration?.processingActivities[0];
  const gaps: string[] = [];
  if (!activity?.activityName && !activity?.name) gaps.push("missing_activity_name");
  if (!activity?.role) gaps.push("missing_role");
  if (!activity?.dataSubjectUniverse?.length && !activity?.dataSubjects?.length) gaps.push("missing_data_subject_universe");
  if (!activity?.purpose) gaps.push("missing_purpose");
  if (!activity?.lawfulBasisOrLegitimateInterest && !activity?.lawfulBasis) gaps.push("missing_lawful_basis");
  if (!activity?.expectedRecipients?.length && !activity?.recipients?.length && !activity?.processors?.length) gaps.push("missing_recipients");
  if (!activity?.retentionPeriod && !activity?.retention) gaps.push("missing_retention_period");
  if (!activity?.dataSource?.length) gaps.push("missing_data_source");

  const declaredRecipients = new Set([...(activity?.expectedRecipients ?? []), ...(activity?.recipients ?? []), ...(activity?.processors ?? [])]);
  if (scanResult.dataFlows.some((flow) => flow.externalRecipient && !declaredRecipients.has(flow.to))) gaps.push("detected_recipient_not_declared");

  const declaredData = new Set([...(activity?.personalData ?? []), ...(activity?.sensitiveData ?? [])]);
  if (scanResult.personalData.some((item) => !declaredData.has(item.field))) gaps.push("detected_data_category_not_declared");

  if (dataCategories.some((category) => category.category.startsWith("Datos sensibles")) && !activity?.dpia?.assessed) {
    gaps.push("sensitive_data_requires_review");
  }

  return [...new Set(gaps)];
}
