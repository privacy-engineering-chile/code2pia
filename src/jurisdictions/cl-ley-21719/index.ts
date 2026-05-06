import type { JurisdictionPack } from "../types.js";
import { generateDpiaDraft, evaluateArticle15Ter } from "./dpia.js";
import { generateRopaDraft } from "./ropa.js";
import { generateRatDraft } from "./rat.js";
import { evaluateChile21719 } from "./rules.js";
import { chile21719PackVersion } from "./schema.js";

export const chileLey21719Pack: JurisdictionPack = {
  id: "CL-LEY-21719",
  country: "CL",
  lawName: "Ley 21.719",
  version: chile21719PackVersion,
  evaluate: evaluateChile21719,
  generateRopaDraft,
  generateRatDraft,
  generateDpiaDraft,
  evaluateDpiaTriggers: evaluateArticle15Ter
};
