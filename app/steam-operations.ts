import { ENGINE_FACT_SHEETS } from "./engine-facts.ts";

export type LocomotiveOperatingProfile = {
  id: string;
  service: "mixed" | "passenger" | "freight";
  maximumSpeedMph: number;
  cruiseSpeedMph: number;
  economicalSpeedMinMph: number;
  economicalSpeedMaxMph: number;
  engineAndTenderTons: number;
  tractiveEffortIndex: number;
  fuelType: "coal" | "oil";
  fuelCapacity: number;
  fuelCapacityUnit: "lb" | "gal";
  waterCapacityGallons: number;
  thermalEfficiency: number;
};

export type ConsistCarType = {
  id: "day-coach" | "pullman" | "baggage-mail" | "dining-car";
  name: string;
  shortName: string;
  emptyTons: number;
  loadedTons: number;
  capacity: string;
  visualClass: string;
  art: string;
};

export type ConsistMetrics = {
  carCount: number;
  totalCarTons: number;
  totalTrainTons: number;
  powerToWeight: number;
  accelerationFactor: number;
  brakeResponseFactor: number;
  resourceLoadFactor: number;
  maximumSpeedFactor: number;
};

export type SteamResourceState = {
  fuel: number;
  water: number;
  stationsWithoutService: number;
  failure: "fuel" | "water" | "service" | null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type PerformanceProfile = Omit<LocomotiveOperatingProfile, "fuelType" | "fuelCapacity" | "fuelCapacityUnit" | "waterCapacityGallons">;

const PERFORMANCE_PROFILES: Readonly<Record<string, PerformanceProfile>> = Object.freeze({
  "tom-thumb": { id: "tom-thumb", service: "mixed", maximumSpeedMph: 55, cruiseSpeedMph: 45, economicalSpeedMinMph: 38, economicalSpeedMaxMph: 47, engineAndTenderTons: 126, tractiveEffortIndex: .78, thermalEfficiency: .88 },
  "southern-4501": { id: "southern-4501", service: "freight", maximumSpeedMph: 60, cruiseSpeedMph: 48, economicalSpeedMinMph: 40, economicalSpeedMaxMph: 51, engineAndTenderTons: 270, tractiveEffortIndex: 1.08, thermalEfficiency: .92 },
  "prr-1361": { id: "prr-1361", service: "passenger", maximumSpeedMph: 90, cruiseSpeedMph: 65, economicalSpeedMinMph: 55, economicalSpeedMaxMph: 69, engineAndTenderTons: 259, tractiveEffortIndex: 1.12, thermalEfficiency: .95 },
  "nkp-765": { id: "nkp-765", service: "mixed", maximumSpeedMph: 80, cruiseSpeedMph: 60, economicalSpeedMinMph: 51, economicalSpeedMaxMph: 64, engineAndTenderTons: 401, tractiveEffortIndex: 1.42, thermalEfficiency: 1.02 },
  "atsf-3751": { id: "atsf-3751", service: "passenger", maximumSpeedMph: 103, cruiseSpeedMph: 72, economicalSpeedMinMph: 61, economicalSpeedMaxMph: 76, engineAndTenderTons: 437, tractiveEffortIndex: 1.46, thermalEfficiency: 1.03 },
  "nw-611": { id: "nw-611", service: "passenger", maximumSpeedMph: 110, cruiseSpeedMph: 75, economicalSpeedMinMph: 64, economicalSpeedMaxMph: 80, engineAndTenderTons: 436, tractiveEffortIndex: 1.62, thermalEfficiency: 1.08 },
  "up-844": { id: "up-844", service: "passenger", maximumSpeedMph: 120, cruiseSpeedMph: 78, economicalSpeedMinMph: 66, economicalSpeedMaxMph: 82, engineAndTenderTons: 454, tractiveEffortIndex: 1.68, thermalEfficiency: 1.1 },
  "nw-1218": { id: "nw-1218", service: "freight", maximumSpeedMph: 70, cruiseSpeedMph: 52, economicalSpeedMinMph: 44, economicalSpeedMaxMph: 56, engineAndTenderTons: 573, tractiveEffortIndex: 1.92, thermalEfficiency: 1.04 },
  "challenger-3985": { id: "challenger-3985", service: "mixed", maximumSpeedMph: 70, cruiseSpeedMph: 58, economicalSpeedMinMph: 49, economicalSpeedMaxMph: 62, engineAndTenderTons: 537, tractiveEffortIndex: 2.08, thermalEfficiency: 1.08 },
  "big-boy-4014": { id: "big-boy-4014", service: "freight", maximumSpeedMph: 80, cruiseSpeedMph: 55, economicalSpeedMinMph: 47, economicalSpeedMaxMph: 59, engineAndTenderTons: 595, tractiveEffortIndex: 2.42, thermalEfficiency: 1.12 },
  "the-flyer-1907": { id: "the-flyer-1907", service: "passenger", maximumSpeedMph: 75, cruiseSpeedMph: 56, economicalSpeedMinMph: 47, economicalSpeedMaxMph: 60, engineAndTenderTons: 238, tractiveEffortIndex: .94, thermalEfficiency: .9 },
  "polar-express-1225": { id: "polar-express-1225", service: "mixed", maximumSpeedMph: 70, cruiseSpeedMph: 54, economicalSpeedMinMph: 46, economicalSpeedMaxMph: 58, engineAndTenderTons: 401, tractiveEffortIndex: 1.38, thermalEfficiency: 1.01 },
});

export const LOCOMOTIVE_OPERATING_PROFILES: Readonly<Record<string, LocomotiveOperatingProfile>> = Object.freeze(
  Object.fromEntries(Object.entries(PERFORMANCE_PROFILES).map(([id, performance]) => {
    const facts = ENGINE_FACT_SHEETS[id];
    if (!facts) throw new Error(`Missing fuel and water facts for ${id}`);
    return [id, {
      ...performance,
      fuelType: facts.fuelType,
      fuelCapacity: facts.fuelCapacity,
      fuelCapacityUnit: facts.fuelCapacityUnit,
      waterCapacityGallons: facts.waterCapacityGallons,
    }];
  })),
);

export const CONSIST_CAR_TYPES: readonly ConsistCarType[] = Object.freeze([
  { id: "day-coach", name: "Day Coach", shortName: "COACH", emptyTons: 52, loadedTons: 61, capacity: "72 passengers", visualClass: "car-day-coach", art: "/assets/carriages/v1/day-coach.webp" },
  { id: "pullman", name: "Pullman Sleeper", shortName: "PULLMAN", emptyTons: 63, loadedTons: 70, capacity: "36 passengers", visualClass: "car-pullman", art: "/assets/carriages/v1/pullman-sleeper.webp" },
  { id: "baggage-mail", name: "Baggage & Mail", shortName: "BAGGAGE", emptyTons: 55, loadedTons: 68, capacity: "18 tons", visualClass: "car-baggage", art: "/assets/carriages/v1/baggage-mail.webp" },
  { id: "dining-car", name: "Dining Car", shortName: "DINER", emptyTons: 65, loadedTons: 74, capacity: "48 passengers", visualClass: "car-dining", art: "/assets/carriages/v1/dining-car.webp" },
]);

export const DEFAULT_CONSIST = ["day-coach", "baggage-mail", "pullman"] as const;

export function operatingProfileFor(engineId: string) {
  return LOCOMOTIVE_OPERATING_PROFILES[engineId] ?? LOCOMOTIVE_OPERATING_PROFILES["tom-thumb"];
}

export function carTypeFor(carId: string) {
  return CONSIST_CAR_TYPES.find((car) => car.id === carId) ?? CONSIST_CAR_TYPES[0];
}

export function calculateConsistMetrics(engineId: string, carIds: readonly string[]): ConsistMetrics {
  const profile = operatingProfileFor(engineId);
  const totalCarTons = carIds.reduce((sum, carId) => sum + carTypeFor(carId).loadedTons, 0);
  const totalTrainTons = profile.engineAndTenderTons + totalCarTons;
  const baselineTons = profile.engineAndTenderTons + CONSIST_CAR_TYPES[0].loadedTons * 3;
  const massRatio = totalTrainTons / baselineTons;
  const powerToWeight = profile.tractiveEffortIndex / Math.pow(Math.max(.55, massRatio), .92);
  const baseAcceleration = .68 + Math.log2(1 + profile.tractiveEffortIndex) * .54;
  return {
    carCount: carIds.length,
    totalCarTons,
    totalTrainTons,
    powerToWeight,
    accelerationFactor: clamp(baseAcceleration / Math.pow(massRatio, .92), .42, 1.95),
    brakeResponseFactor: clamp(.72 + massRatio * .22 + carIds.length * .045, .9, 1.55),
    resourceLoadFactor: clamp(.68 + massRatio * .31 + carIds.length * .012, .82, 1.52),
    maximumSpeedFactor: clamp(1.025 - Math.max(0, massRatio - 1) * .2 - Math.max(0, carIds.length - 3) * .014, .72, 1),
  };
}

export const createSteamResourceState = (): SteamResourceState => ({
  fuel: 100,
  water: 100,
  stationsWithoutService: 0,
  failure: null,
});

export function advanceSteamResources(
  state: SteamResourceState,
  profile: LocomotiveOperatingProfile,
  metrics: ConsistMetrics,
  controls: { throttle: number; boilerLoad: number; heat: number; speed: number; paused?: boolean },
  elapsedSeconds: number,
): SteamResourceState {
  if (state.failure || controls.paused) return state;
  const dt = clamp(elapsedSeconds, 0, .1);
  if (dt === 0) return state;

  const regulator = clamp(controls.throttle, 0, 100) / 100;
  const steamDemand = .24 + regulator * .76;
  const movingDemand = .38 + clamp(controls.speed / profile.cruiseSpeedMph, 0, 1.4) * .62;
  // The fact-sheet tender capacity is the denominator. Demand is converted to
  // an absolute lb/hour or gal/hour burn before it becomes a percentage, so a
  // larger tender genuinely provides more range instead of merely displaying
  // a larger historical number beside an arbitrary percentage rate.
  const fuelUsePerHour = profile.fuelType === "coal"
    ? 1_050 + profile.engineAndTenderTons * 5.4
    : 180 + profile.engineAndTenderTons * 1.15;
  const waterUsePerHour = 900 + profile.engineAndTenderTons * 6;
  const simulationTimeScale = 64;
  const fuelBurnPercent = fuelUsePerHour * simulationTimeScale / 36 / profile.fuelCapacity *
    steamDemand * movingDemand * metrics.resourceLoadFactor / profile.thermalEfficiency;
  const overheatBoilOff = 1 + clamp((controls.heat - 70) / 30, 0, 1) * 1.65;
  const boilerDemand = .28 + clamp(controls.boilerLoad / 100, 0, 1) * .72;
  const waterBurnPercent = waterUsePerHour * simulationTimeScale / 36 / profile.waterCapacityGallons *
    boilerDemand * movingDemand * metrics.resourceLoadFactor * overheatBoilOff / profile.thermalEfficiency;
  const fuel = clamp(state.fuel - fuelBurnPercent * dt, 0, 100);
  const water = clamp(state.water - waterBurnPercent * dt, 0, 100);
  return {
    ...state,
    fuel,
    water,
    failure: fuel <= 0 ? "fuel" : water <= 0 ? "water" : null,
  };
}

export function recordPassedStation(state: SteamResourceState): SteamResourceState {
  if (state.failure) return state;
  const stationsWithoutService = state.stationsWithoutService + 1;
  return {
    ...state,
    stationsWithoutService,
    failure: stationsWithoutService >= 4 ? "service" : null,
  };
}

export function serviceSteamLocomotive(state: SteamResourceState): SteamResourceState {
  if (state.failure) return state;
  return { fuel: 100, water: 100, stationsWithoutService: 0, failure: null };
}

export function calculateServiceDurationSeconds(state: SteamResourceState, metrics: ConsistMetrics) {
  const depletion = (200 - state.fuel - state.water) / 200;
  const consistWork = Math.max(0, metrics.carCount - 3) * .48;
  const missedStops = state.stationsWithoutService * .42;
  return clamp(2.4 + depletion * 4.8 + consistWork + missedStops, 2.4, 10);
}

export const stationsUntilServiceRequired = (state: SteamResourceState) =>
  Math.max(0, 4 - state.stationsWithoutService);
