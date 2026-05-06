import type { ComplianceFinding, DataFlow, EipdAssessment, PersonalDataCategory, PersonalDataFinding, RiskFinding } from "../core/types.js";

interface Chile21719Input {
  personalData: PersonalDataFinding[];
  risks: RiskFinding[];
  dataFlows: DataFlow[];
  missingEvidence: string[];
}

interface Chile21719Result {
  compliance: ComplianceFinding[];
  eipd: EipdAssessment;
}

const sensitiveCategories = new Set<PersonalDataCategory>([
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

export function mapChile21719Compliance(input: Chile21719Input): Chile21719Result {
  const categories = [...new Set(input.personalData.map((finding) => finding.category))];
  const hasPersonalData = input.personalData.length > 0;
  const hasSensitiveData = input.personalData.some((finding) => sensitiveCategories.has(finding.category));
  const hasExternalTransfer = input.dataFlows.some((flow) => flow.leavesSystem);
  const logsPersonalData = input.risks.some((risk) => risk.id === "logging-personal-data");
  const hasAnalytics = input.risks.some((risk) => risk.id === "analytics-tracking-library");
  const missingPurpose = input.risks.some((risk) => risk.id === "missing-purpose-definition") || input.missingEvidence.some((item) => /purpose/i.test(item));
  const missingRetention = input.risks.some((risk) => risk.id === "missing-retention-definition") || input.missingEvidence.some((item) => /retention/i.test(item));

  const compliance: ComplianceFinding[] = [
    {
      id: "CL-21719-ART-3-LICITUD",
      profile: "chile-21719",
      topic: "Licitud y fuente de licitud",
      legalReference: "Ley 21.719, Art. 3 letra a and Art. 13",
      status: hasPersonalData ? "missing-evidence" : "pass",
      summary: hasPersonalData
        ? "Personal data was detected, but code alone does not prove consent or another lawful basis."
        : "No personal data indicators were detected by the current heuristics.",
      evidence: categories,
      recommendation: "Document the lawful basis for each processing purpose, such as consent, contract, legal obligation, or legitimate interest assessment."
    },
    {
      id: "CL-21719-ART-3-FINALIDAD",
      profile: "chile-21719",
      topic: "Finalidad",
      legalReference: "Ley 21.719, Art. 3 letra b",
      status: !hasPersonalData ? "pass" : missingPurpose ? "missing-evidence" : "warning",
      summary: missingPurpose
        ? "The scan found personal data without code-level evidence of explicit processing purposes."
        : hasPersonalData
          ? "Purpose-like evidence was detected, but it still needs human validation."
          : "No personal data indicators were detected by the current heuristics.",
      evidence: evidenceForRisk(input.risks, "missing-purpose-definition"),
      recommendation: "Keep purpose evidence close to the data model or service, and reference it in product/privacy documentation."
    },
    {
      id: "CL-21719-ART-3-PROPORCIONALIDAD",
      profile: "chile-21719",
      topic: "Proporcionalidad, minimizacion y conservacion",
      legalReference: "Ley 21.719, Art. 3 letra c",
      status: !hasPersonalData ? "pass" : missingRetention || categories.length >= 5 ? "missing-evidence" : "warning",
      summary: missingRetention
        ? "Personal data was detected without retention/deletion evidence."
        : "Review whether each detected data category is necessary for the stated purpose.",
      evidence: categories,
      recommendation: "Document retention periods, deletion triggers, and why each data category is necessary."
    },
    {
      id: "CL-21719-ART-3-TRANSPARENCIA",
      profile: "chile-21719",
      topic: "Transparencia e informacion",
      legalReference: "Ley 21.719, Art. 3 letra g",
      status: hasPersonalData ? "missing-evidence" : "pass",
      summary: hasPersonalData
        ? "The scanner cannot confirm that users receive clear notice about the detected processing."
        : "No personal data indicators were detected by the current heuristics.",
      evidence: categories,
      recommendation: "Link each processing activity to a privacy notice or in-product disclosure."
    },
    {
      id: "CL-21719-ART-14-SEGURIDAD-CONFIDENCIALIDAD",
      profile: "chile-21719",
      topic: "Seguridad y confidencialidad",
      legalReference: "Ley 21.719, Art. 14 bis and Art. 14 quinquies",
      status: logsPersonalData ? "action-required" : hasPersonalData ? "warning" : "pass",
      summary: logsPersonalData
        ? "Personal data appears in logs, which creates confidentiality and security risk."
        : "Security controls cannot be fully proven from the current code signals.",
      evidence: evidenceForRisk(input.risks, "logging-personal-data"),
      recommendation: "Redact personal data from logs and document encryption, access control, audit, backup, and incident-response controls."
    },
    {
      id: "CL-21719-ART-16-SENSIBLES",
      profile: "chile-21719",
      topic: "Datos personales sensibles",
      legalReference: "Ley 21.719, Art. 16 and special-category provisions",
      status: hasSensitiveData ? "action-required" : "pass",
      summary: hasSensitiveData
        ? "Sensitive or high-sensitivity data indicators were detected."
        : "No sensitive personal data indicators were detected by the current heuristics.",
      evidence: categories.filter((category) => sensitiveCategories.has(category)),
      recommendation: "Confirm whether express consent or a specific statutory basis applies, and apply stricter security, minimization, and access controls."
    },
    {
      id: "CL-21719-TRANSFERENCIAS-ENCARGADOS",
      profile: "chile-21719",
      topic: "Encargados, destinatarios y transferencias",
      legalReference: "Ley 21.719 controller/processor, communication, and international-transfer duties",
      status: hasExternalTransfer ? "action-required" : hasAnalytics ? "warning" : "pass",
      summary: hasExternalTransfer
        ? "A data flow appears to send personal data outside the system."
        : hasAnalytics
          ? "Analytics tooling may involve third-party processing or tracking."
          : "No external transfer indicators were detected by the current heuristics.",
      evidence: input.dataFlows.filter((flow) => flow.leavesSystem).map((flow) => flow.evidence),
      recommendation: "Document recipients, processor contracts, transfer safeguards, vendor review, and whether data leaves Chile."
    },
    {
      id: "CL-21719-ARCOP",
      profile: "chile-21719",
      topic: "Derechos de titulares ARCOP",
      legalReference: "Ley 21.719 data-subject rights: access, rectification, suppression, opposition, portability, blocking",
      status: hasPersonalData ? "missing-evidence" : "pass",
      summary: hasPersonalData
        ? "The scan cannot confirm workflows for access, rectification, suppression, opposition, portability, or blocking."
        : "No personal data indicators were detected by the current heuristics.",
      evidence: [],
      recommendation: "Document product/API workflows for ARCOP requests and operational response ownership."
    }
  ];

  return {
    compliance,
    eipd: assessEipd(input, { hasSensitiveData, hasExternalTransfer, logsPersonalData, hasAnalytics })
  };
}

function assessEipd(
  input: Chile21719Input,
  flags: { hasSensitiveData: boolean; hasExternalTransfer: boolean; logsPersonalData: boolean; hasAnalytics: boolean }
): EipdAssessment {
  const triggers = new Set<string>();

  if (flags.hasSensitiveData) {
    triggers.add("Sensitive or high-sensitivity data detected.");
  }

  if (flags.hasExternalTransfer) {
    triggers.add("Personal data appears to leave the system.");
  }

  if (flags.logsPersonalData) {
    triggers.add("Personal data appears in logs.");
  }

  if (flags.hasAnalytics) {
    triggers.add("Analytics/tracking tooling detected.");
  }

  if (input.personalData.length >= 10) {
    triggers.add("Large number of personal data indicators detected.");
  }

  const required = flags.hasSensitiveData || (flags.hasExternalTransfer && input.personalData.length > 0) || triggers.size >= 3;
  const likelihood = required ? "high" : input.personalData.length > 0 ? "medium" : "low";

  return {
    required,
    likelihood,
    triggers: [...triggers],
    rationale: required
      ? "Under a Chile Law 21.719 profile, the detected processing is likely high-risk enough to require a human-led EIPD before or during implementation."
      : "The current code signals do not clearly trigger a required EIPD, but legal/privacy review is still needed for any real processing."
  };
}

function evidenceForRisk(risks: RiskFinding[], riskId: string): string[] {
  return risks.filter((risk) => risk.id === riskId).map((risk) => risk.evidence);
}
