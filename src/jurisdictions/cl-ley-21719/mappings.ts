export function principlesForFinding(type: string): string[] {
  if (type === "personal_data_in_logs") return ["seguridad", "confidencialidad", "responsabilidad"];
  if (type === "external_api_transfer") return ["transparencia", "responsabilidad", "licitud", "transferencias"];
  if (type === "tracking_library") return ["finalidad", "transparencia", "proporcionalidad"];
  if (type === "missing_purpose_definition") return ["finalidad", "licitud", "transparencia"];
  if (type === "missing_retention_definition") return ["proporcionalidad", "minimizacion", "conservacion"];
  return ["responsabilidad"];
}

export const sensitiveCategories = new Set([
  "health",
  "biometric",
  "genetic",
  "ethnicRace",
  "politicalAffiliation",
  "unionAffiliation",
  "socioeconomic",
  "ideologyBelief",
  "religion",
  "sexualLife",
  "sexualOrientation",
  "genderIdentity"
]);
