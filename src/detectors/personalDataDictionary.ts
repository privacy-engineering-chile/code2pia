import type { PersonalDataCategory, Sensitivity } from "../core/types.js";

export interface PersonalDataRule {
  category: PersonalDataCategory;
  sensitivity: Sensitivity;
  patterns: RegExp[];
}

export const personalDataRules: PersonalDataRule[] = [
  { category: "rut", sensitivity: "high", patterns: [/\brut\b/i, /\bnational(?:_|-)?id\b/i, /\btax(?:_|-)?id\b/i] },
  { category: "email", sensitivity: "medium", patterns: [/\be-?mail\b/i, /\bemail(?:Address)?\b/i] },
  { category: "phone", sensitivity: "medium", patterns: [/\bphone\b/i, /\bmobile\b/i, /\btelephone\b/i] },
  { category: "address", sensitivity: "medium", patterns: [/\baddress\b/i, /\bstreet\b/i, /\bpostal(?:Code)?\b/i] },
  { category: "name", sensitivity: "low", patterns: [/\bfull(?:_|-)?name\b/i, /\bfirst(?:_|-)?name\b/i, /\blast(?:_|-)?name\b/i, /\bname\b/i] },
  { category: "birthDate", sensitivity: "medium", patterns: [/\bbirth(?:\s|_|-)?date\b/i, /\bdate(?:\s|_|-)?of(?:\s|_|-)?birth\b/i, /\bdob\b/i] },
  { category: "accountNumber", sensitivity: "high", patterns: [/\baccount(?:\s|_|-)?number\b/i, /\bbank(?:\s|_|-)?account\b/i, /\biban\b/i] },
  { category: "health", sensitivity: "high", patterns: [/\bhealth/i, /\bmedical/i, /\bdiagnosis/i, /\bclinical/i] },
  { category: "location", sensitivity: "medium", patterns: [/\blocation\b/i, /\blatitude\b/i, /\blongitude\b/i, /\bgps\b/i, /\bgeo(?:_|-)?point\b/i] },
  { category: "biometric", sensitivity: "high", patterns: [/\bbiometric/i, /\bfingerprint/i, /\bface(?:\s|_|-)?id\b/i, /\bfacial(?:\s|_|-)?recognition\b/i, /\biris\b/i, /\bvoice(?:\s|_|-)?print\b/i] },
  { category: "genetic", sensitivity: "high", patterns: [/\bgenetic/i, /\bdna\b/i, /\bgenome\b/i, /\bbiological(?:\s|_|-)?profile\b/i, /\bbiological(?:\s|_|-)?data\b/i] },
  { category: "ethnicRace", sensitivity: "high", patterns: [/\bethnic/i, /\brace\b/i, /\bracial/i, /\bethnicity\b/i] },
  { category: "politicalAffiliation", sensitivity: "high", patterns: [/\bpolitical/i, /\bparty(?:\s|_|-)?affiliation\b/i, /\bpolitical(?:\s|_|-)?party\b/i] },
  { category: "unionAffiliation", sensitivity: "high", patterns: [/\bunion(?:\s|_|-)?affiliation\b/i, /\btrade(?:\s|_|-)?union\b/i, /\bguild(?:\s|_|-)?membership\b/i, /\bgremial\b/i] },
  { category: "socioeconomic", sensitivity: "high", patterns: [/\bsocioeconomic/i, /\bincome(?:\s|_|-)?level\b/i, /\bsalary\b/i, /\beconomic(?:\s|_|-)?status\b/i] },
  { category: "ideologyBelief", sensitivity: "high", patterns: [/\bideolog/i, /\bphilosophical(?:\s|_|-)?belief/i, /\bconviction/i] },
  { category: "religion", sensitivity: "high", patterns: [/\breligion\b/i, /\breligious/i, /\bfaith\b/i, /\bcreed\b/i] },
  { category: "sexualLife", sensitivity: "high", patterns: [/\bsexual(?:\s|_|-)?life\b/i, /\bsex(?:\s|_|-)?life\b/i] },
  { category: "sexualOrientation", sensitivity: "high", patterns: [/\bsexual(?:\s|_|-)?orientation\b/i] },
  { category: "genderIdentity", sensitivity: "high", patterns: [/\bgender(?:\s|_|-)?identity\b/i, /\btransgender\b/i, /\bnonbinary\b/i, /\bnon(?:\s|_|-)?binary\b/i] }
];

export function classifyPersonalData(identifier: string): PersonalDataRule | undefined {
  const normalized = identifier.replace(/[_-]+/g, " ");
  return personalDataRules.find((rule) => rule.patterns.some((pattern) => pattern.test(identifier) || pattern.test(normalized)));
}
