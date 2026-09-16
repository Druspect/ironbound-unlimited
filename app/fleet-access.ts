import { LOCOMOTIVES, STARTER_LOCOMOTIVE_ID } from "./locomotive-catalog.ts";

// Public progression is earned. A deliberate reviewFleet URL switch gives a
// tester temporary access to the full roster without changing ownership or
// permanently weakening the save economy.
export const FLEET_REVIEW_UNLOCKED = false;
export const FLEET_REVIEW_QUERY = "reviewFleet";
export const ACTIVE_LOCOMOTIVE_IDS: readonly string[] = LOCOMOTIVES.map((engine) => engine.id);
export const ACTIVE_LOCOMOTIVES = LOCOMOTIVES.filter((engine) => ACTIVE_LOCOMOTIVE_IDS.includes(engine.id));
export type FleetSave = { bonds: number; ownedEngines: string[]; equippedEngine: string };

export function isFleetReviewEnabled(search?: string) {
  if (FLEET_REVIEW_UNLOCKED) return true;
  const locationSearch = search ?? (typeof window !== "undefined" ? window.location.search : "");
  return new URLSearchParams(locationSearch).get(FLEET_REVIEW_QUERY) === "1";
}

export function canEquipLocomotive(id: string, ownedEngines: readonly string[], review = isFleetReviewEnabled()) {
  return ACTIVE_LOCOMOTIVES.some((engine) => engine.id === id) && (review || ownedEngines.includes(id));
}

export function resolveEquippedLocomotive(id: string, ownedEngines: readonly string[], review = isFleetReviewEnabled()) {
  return canEquipLocomotive(id, ownedEngines, review) ? id : STARTER_LOCOMOTIVE_ID;
}

export function selectLocomotive(save: FleetSave, id: string, review = isFleetReviewEnabled()): FleetSave {
  const engine = ACTIVE_LOCOMOTIVES.find((candidate) => candidate.id === id);
  if (!engine) return save;
  if (canEquipLocomotive(id, save.ownedEngines, review)) return { ...save, equippedEngine: id };
  if (save.bonds < engine.cost) return save;
  return { bonds: save.bonds - engine.cost, ownedEngines: [...save.ownedEngines, id], equippedEngine: id };
}
