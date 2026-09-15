import { ENGINE_FACT_SHEETS } from "./engine-facts.ts";

export type CarriageId = "day-coach" | "pullman" | "baggage-mail" | "dining-car" | "observation-car";
export type CarriageFamilyId = "early-heavyweight" | "interwar-heavyweight" | "late-steam-passenger";
export type CarriageRoadGroupId =
  | "ironbound-heritage"
  | "southern"
  | "pennsylvania"
  | "nickel-plate"
  | "santa-fe"
  | "norfolk-western"
  | "union-pacific"
  | "pere-marquette";

export type CarriageFamily = {
  id: CarriageFamilyId;
  label: string;
  eraLabel: string;
  engineIds: readonly string[];
  allowedCarIds: readonly CarriageId[];
  preferredOrder: readonly CarriageId[];
  compatibilityNote: string;
};

export type CarriageRoadGroup = {
  id: CarriageRoadGroupId;
  label: string;
  engineIds: readonly string[];
  liveryKey: string;
  note: string;
};

export type EngineCarriageCompatibility = CarriageFamily & {
  familyLabel: string;
  roadGroupId: CarriageRoadGroupId;
  roadLabel: string;
  liveryKey: string;
  roadCompatibilityNote: string;
};

const ALL_PASSENGER_CARS = ["day-coach", "pullman", "baggage-mail", "dining-car", "observation-car"] as const;

/**
 * The current five generic car roles all existed in the broad heavyweight era,
 * so compatibility does not invent a type-level ban. Era families instead
 * define ordering/context, while railroad groups provide identity and a future
 * livery hook. Shared production art is never asserted to be an authentic
 * railroad-owned car.
 */
export const CARRIAGE_FAMILIES: readonly CarriageFamily[] = Object.freeze([
  {
    id: "early-heavyweight",
    label: "Early Heavyweight",
    eraLabel: "1900–1924 steam-era passenger stock",
    engineIds: ["tom-thumb", "southern-4501", "prr-1361", "the-flyer-1907"],
    allowedCarIds: ALL_PASSENGER_CARS,
    preferredOrder: ["observation-car", "pullman", "day-coach", "dining-car", "baggage-mail"],
    compatibilityNote: "Heavyweight-era passenger roles with head-end baggage nearest the tender and parlor/observation service toward the rear.",
  },
  {
    id: "interwar-heavyweight",
    label: "Interwar Heavyweight",
    eraLabel: "1925–1939 long-distance passenger stock",
    engineIds: ["atsf-3751"],
    allowedCarIds: ALL_PASSENGER_CARS,
    preferredOrder: ["observation-car", "pullman", "day-coach", "dining-car", "baggage-mail"],
    compatibilityNote: "Heavyweight long-distance consist appropriate to late-1920s and 1930s passenger service.",
  },
  {
    id: "late-steam-passenger",
    label: "Late Steam Passenger",
    eraLabel: "1940–1955 steam-era passenger and excursion stock",
    engineIds: ["nkp-765", "nw-611", "up-844", "nw-1218", "challenger-3985", "big-boy-4014", "polar-express-1225"],
    allowedCarIds: ALL_PASSENGER_CARS,
    preferredOrder: ["observation-car", "pullman", "day-coach", "dining-car", "baggage-mail"],
    compatibilityNote: "Late-steam passenger/excursion family; road identity is tracked separately from the generic production art.",
  },
]);

export const CARRIAGE_ROAD_GROUPS: readonly CarriageRoadGroup[] = Object.freeze([
  { id: "ironbound-heritage", label: "Ironbound Heritage", engineIds: ["tom-thumb", "the-flyer-1907"], liveryKey: "ironbound-heritage", note: "Fictional house-road identity for Ironbound roster engines." },
  { id: "southern", label: "Southern Railway", engineIds: ["southern-4501"], liveryKey: "southern-passenger", note: "Southern-compatible passenger/excursion identity; shared car art is not claimed as a Southern prototype." },
  { id: "pennsylvania", label: "Pennsylvania Railroad", engineIds: ["prr-1361"], liveryKey: "pennsy-heavyweight", note: "PRR-compatible heavyweight identity; shared car art is not claimed as a PRR prototype." },
  { id: "nickel-plate", label: "Nickel Plate Road", engineIds: ["nkp-765"], liveryKey: "nickel-plate-excursion", note: "Nickel Plate excursion-compatible identity using generic late-steam stock." },
  { id: "santa-fe", label: "Santa Fe", engineIds: ["atsf-3751"], liveryKey: "santa-fe-heavyweight", note: "Santa Fe-compatible interwar passenger identity; generic art avoids a false livery claim." },
  { id: "norfolk-western", label: "Norfolk & Western", engineIds: ["nw-611", "nw-1218"], liveryKey: "nw-excursion", note: "N&W-compatible excursion/passenger identity for preserved steam operation." },
  { id: "union-pacific", label: "Union Pacific", engineIds: ["up-844", "challenger-3985", "big-boy-4014"], liveryKey: "up-excursion", note: "UP-compatible excursion identity for the preserved steam fleet." },
  { id: "pere-marquette", label: "Pere Marquette inspired", engineIds: ["polar-express-1225"], liveryKey: "pm-winter-excursion", note: "1225-inspired winter excursion identity; no film-owned carriage design is asserted." },
]);

const FAMILY_BY_ENGINE = Object.freeze(Object.fromEntries(
  CARRIAGE_FAMILIES.flatMap((family) => family.engineIds.map((engineId) => [engineId, family])),
)) as Readonly<Record<string, CarriageFamily>>;

const ROAD_GROUP_BY_ENGINE = Object.freeze(Object.fromEntries(
  CARRIAGE_ROAD_GROUPS.flatMap((group) => group.engineIds.map((engineId) => [engineId, group])),
)) as Readonly<Record<string, CarriageRoadGroup>>;

export function carriageFamilyForEngine(engineId: string): EngineCarriageCompatibility {
  const family = FAMILY_BY_ENGINE[engineId];
  const road = ROAD_GROUP_BY_ENGINE[engineId];
  if (!family) throw new Error(`No carriage era family registered for ${engineId}`);
  if (!road) throw new Error(`No carriage railroad group registered for ${engineId}`);
  return {
    ...family,
    familyLabel: family.label,
    label: `${road.label} • ${family.label}`,
    roadGroupId: road.id,
    roadLabel: road.label,
    liveryKey: road.liveryKey,
    roadCompatibilityNote: road.note,
  };
}

export function compatibleCarIdsForEngine(engineId: string): readonly CarriageId[] {
  return carriageFamilyForEngine(engineId).allowedCarIds;
}

export function isCarCompatibleWithEngine(engineId: string, carId: string): carId is CarriageId {
  return compatibleCarIdsForEngine(engineId).includes(carId as CarriageId);
}

/**
 * Replaces unknown selections deterministically while preserving train length.
 * It also provides the migration point for future road-specific car families.
 */
export function normalizeConsistForEngine(engineId: string, carIds: readonly string[]): CarriageId[] {
  const family = carriageFamilyForEngine(engineId);
  let replacementIndex = 0;
  return carIds.map((carId) => {
    if (family.allowedCarIds.includes(carId as CarriageId)) return carId as CarriageId;
    const replacement = family.preferredOrder[replacementIndex % family.preferredOrder.length];
    replacementIndex += 1;
    return replacement;
  });
}

export function validateCarriageFamilyCoverage() {
  const engineIds = Object.keys(ENGINE_FACT_SHEETS).sort();
  const eraRegistered = Object.keys(FAMILY_BY_ENGINE).sort();
  const roadRegistered = Object.keys(ROAD_GROUP_BY_ENGINE).sort();
  const eraDuplicates = CARRIAGE_FAMILIES.flatMap((family) => family.engineIds)
    .filter((id, index, all) => all.indexOf(id) !== index);
  const roadDuplicates = CARRIAGE_ROAD_GROUPS.flatMap((group) => group.engineIds)
    .filter((id, index, all) => all.indexOf(id) !== index);
  return {
    missing: engineIds.filter((id) => !eraRegistered.includes(id) || !roadRegistered.includes(id)),
    unknown: [...new Set([
      ...eraRegistered.filter((id) => !engineIds.includes(id)),
      ...roadRegistered.filter((id) => !engineIds.includes(id)),
    ])],
    duplicates: [...new Set([...eraDuplicates, ...roadDuplicates])],
  };
}
