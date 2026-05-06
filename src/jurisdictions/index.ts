import { chileLey21719Pack } from "./cl-ley-21719/index.js";
import type { JurisdictionPack } from "./types.js";

const packs: JurisdictionPack[] = [chileLey21719Pack];

export function getJurisdictionPack(id: string): JurisdictionPack {
  const pack = packs.find((item) => item.id.toUpperCase() === id.toUpperCase());
  if (!pack) {
    throw new Error(`Unsupported jurisdiction "${id}". Available: ${packs.map((item) => item.id).join(", ")}.`);
  }
  return pack;
}

export function listJurisdictionPacks(): JurisdictionPack[] {
  return packs;
}
