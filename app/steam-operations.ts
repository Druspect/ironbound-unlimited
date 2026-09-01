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
  throttleResponseFactor: number;
  adhesionFactor: number;
  steamingCapacityFactor: number;
  brakeRiggingFactor: number;
};

export type ConsistCarType = {
  id: "day-coach" | "pullman" | "baggage-mail" | "dining-car" | "observation-car";
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

export const LOCOMOTIVE_OPERATING_PROFILES: Readonly<Record<string, LocomotiveOperatingProfile>> = Object.freeze(
  Object.fromEntries(Object.entries(ENGINE_FACT_SHEETS).map(([id, facts]) => {
    const articulated = facts.wheelArrangement.split("-").length > 3;
    const serviceCruiseRatio = facts.service === "passenger" ? .68 : facts.service === "freight" ? .77 : .74;
    const cruiseSpeedMph = Math.round(facts.maximumSpeedMph * serviceCruiseRatio);
    const powerDensity = facts.tractiveEffortLbf / (facts.engineAndTenderTons * 2_000);
    const driverScale = facts.driverDiameterInches / 70;
    const eraFactor = clamp((facts.builtYear - 1900) / 50, 0, 1);
    const throttleResponseFactor = clamp(
      (facts.service === "passenger" ? 1.08 : facts.service === "freight" ? .94 : 1) *
      Math.pow(driverScale, .35) * Math.pow(400 / facts.engineAndTenderTons, .08) * (articulated ? .86 : 1),
      .72,
      1.24,
    );
    const adhesionFactor = clamp(
      .78 + powerDensity * 1.45 + (facts.service === "freight" ? .06 : 0) - (driverScale - 1) * .07,
      .84,
      1.12,
    );
    const steamingCapacityFactor = clamp(
      .78 + (facts.waterCapacityGallons / facts.engineAndTenderTons) / 180 + eraFactor * .08 + (facts.fuelType === "oil" ? .035 : 0),
      .86,
      1.18,
    );
    const brakeRiggingFactor = clamp(
      1.12 - facts.engineAndTenderTons / 1_900 + (facts.service === "passenger" ? .08 : 0) - (articulated ? .05 : 0),
      .76,
      1.16,
    );
    return [id, {
      id,
      service: facts.service,
      maximumSpeedMph: facts.maximumSpeedMph,
      cruiseSpeedMph,
      economicalSpeedMinMph: Math.round(cruiseSpeedMph * .84),
      economicalSpeedMaxMph: Math.round(cruiseSpeedMph * 1.06),
      engineAndTenderTons: facts.engineAndTenderTons,
      tractiveEffortIndex: clamp(facts.tractiveEffortLbf / 52_000, .5, 2.7),
      fuelType: facts.fuelType,
      fuelCapacity: facts.fuelCapacity,
      fuelCapacityUnit: facts.fuelCapacityUnit,
      waterCapacityGallons: facts.waterCapacityGallons,
      thermalEfficiency: clamp(.84 + eraFactor * .18 + (facts.fuelType === "oil" ? .04 : 0) + (facts.service === "passenger" ? .02 : 0), .86, 1.1),
      throttleResponseFactor,
      adhesionFactor,
      steamingCapacityFactor,
      brakeRiggingFactor,
    }];
  })),
);

export const CONSIST_CAR_TYPES: readonly ConsistCarType[] = Object.freeze([
  { id: "day-coach", name: "Day Coach", shortName: "COACH", emptyTons: 52, loadedTons: 61, capacity: "72 passengers", visualClass: "car-day-coach", art: "/assets/carriages/v1/day-coach.webp" },
  { id: "pullman", name: "Pullman Sleeper", shortName: "PULLMAN", emptyTons: 63, loadedTons: 70, capacity: "36 passengers", visualClass: "car-pullman", art: "/assets/carriages/v1/pullman-sleeper.webp" },
  { id: "baggage-mail", name: "Baggage & Mail", shortName: "BAGGAGE", emptyTons: 55, loadedTons: 68, capacity: "18 tons", visualClass: "car-baggage", art: "/assets/carriages/v1/baggage-mail.webp" },
  { id: "dining-car", name: "Dining Car", shortName: "DINER", emptyTons: 65, loadedTons: 74, capacity: "48 passengers", visualClass: "car-dining", art: "/assets/carriages/v1/dining-car.webp" },
  { id: "observation-car", name: "Observation Parlor", shortName: "OBSERVATION", emptyTons: 66, loadedTons: 73, capacity: "28 passengers", visualClass: "car-observation", art: "/assets/carriages/v1/observation-car.webp" },
]);

// The array is rear-to-front in the scene; head-end baggage belongs nearest
// the tender and the sleeping car stays at the quiet rear of the train.
export const DEFAULT_CONSIST = ["pullman", "day-coach", "baggage-mail"] as const;

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
