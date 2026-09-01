import { LOCOMOTIVES, STARTER_LOCOMOTIVE_ID } from "./locomotive-catalog.ts";

// Public progression is earned. Tests and local visual-QA routes can still
// pass an explicit review flag without silently disabling the game economy.
export const FLEET_REVIEW_UNLOCKED = false;
export const ACTIVE_LOCOMOTIVE_IDS: readonly string[] = LOCOMOTIVES.map((engine) => engine.id);
export const ACTIVE_LOCOMOTIVES = LOCOMOTIVES.filter((engine) => ACTIVE_LOCOMOTIVE_IDS.includes(engine.id));
export type FleetSave = { bonds: number; ownedEngines: string[]; equippedEngine: string };

export function canEquipLocomotive(id: string, ownedEngines: readonly string[], review = FLEET_REVIEW_UNLOCKED) {
  return ACTIVE_LOCOMOTIVES.some((engine) => engine.id === id) && (review || ownedEngines.includes(id));
}

export function resolveEquippedLocomotive(id: string, ownedEngines: readonly string[], review = FLEET_REVIEW_UNLOCKED) {
  return canEquipLocomotive(id, ownedEngines, review) ? id : STARTER_LOCOMOTIVE_ID;
}

export function selectLocomotive(save: FleetSave, id: string, review = FLEET_REVIEW_UNLOCKED): FleetSave {
  const engine = ACTIVE_LOCOMOTIVES.find((candidate) => candidate.id === id);
  if (!engine) return save;
  if (canEquipLocomotive(id, save.ownedEngines, review)) return { ...save, equippedEngine: id };
  if (save.bonds < engine.cost) return save;
  return { bonds: save.bonds - engine.cost, ownedEngines: [...save.ownedEngines, id], equippedEngine: id };
}
