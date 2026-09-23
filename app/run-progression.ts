import { ROUTE_TILE_TRAVEL } from "./route-profile.ts";

export type StationServiceKind = "passenger" | "water" | "full";

export type RunStation = {
  id: string;
  name: string;
  position: number;
  baseBonds: number;
  art: "plains" | "mesa" | "pine" | "river";
  serviceArt: string;
  serviceKind: StationServiceKind;
  serviceLabel: string;
};

export const RUN_STATIONS: readonly RunStation[] = Object.freeze([
  {
    id: "cinder-flats",
    name: "Cinder Flats",
    position: 0.82 * ROUTE_TILE_TRAVEL,
    baseBonds: 250,
    art: "plains",
    serviceArt: "cinder-flats",
    serviceKind: "passenger",
    serviceLabel: "Passengers",
  },
  {
    id: "copper-wash",
    name: "Copper Wash",
    position: 5.82 * ROUTE_TILE_TRAVEL,
    baseBonds: 300,
    art: "mesa",
    serviceArt: "copper-wash",
    serviceKind: "water",
    serviceLabel: "Passengers + water",
  },
  {
    id: "saltworks",
    name: "Saltworks",
    position: 10.82 * ROUTE_TILE_TRAVEL,
    baseBonds: 350,
    art: "plains",
    serviceArt: "saltworks",
    serviceKind: "passenger",
    serviceLabel: "Passengers + mail",
  },
  {
    id: "timberline",
    name: "Timberline",
    position: 15.82 * ROUTE_TILE_TRAVEL,
    baseBonds: 425,
    art: "pine",
    serviceArt: "timberline",
    serviceKind: "full",
    serviceLabel: "Full fuel + water service",
  },
  {
    id: "summit-house",
    name: "Summit House",
    position: 20.82 * ROUTE_TILE_TRAVEL,
    baseBonds: 500,
    art: "pine",
    serviceArt: "summit-house",
    serviceKind: "water",
    serviceLabel: "Passengers + water",
  },
  {
    id: "stillwater",
    name: "Stillwater",
    position: 25.82 * ROUTE_TILE_TRAVEL,
    baseBonds: 650,
    art: "river",
    serviceArt: "stillwater",
    serviceKind: "full",
    serviceLabel: "Terminal full service",
  },
]);

export const RUN_STATION_COUNT = RUN_STATIONS.length;
export const RUN_COMPLETION_BASE_BONDS = 1_200;

export type RunProgress = {
  clearedStationIds: string[];
  stationBonds: number;
  drivingBonusBonds: number;
  completionBonusBonds: number;
  completed: boolean;
};

export type CareerProgress = {
  completedRuns: number;
  totalStationsCleared: number;
  lifetimeBondsEarned: number;
  bestRunBonds: number;
};

export function createRunProgress(): RunProgress {
  return {
    clearedStationIds: [],
    stationBonds: 0,
    drivingBonusBonds: 0,
    completionBonusBonds: 0,
    completed: false,
  };
}

export function createCareerProgress(): CareerProgress {
  return {
    completedRuns: 0,
    totalStationsCleared: 0,
    lifetimeBondsEarned: 0,
    bestRunBonds: 0,
  };
}

export function normalizeRunProgress(value: unknown): RunProgress {
  if (!value || typeof value !== "object") return createRunProgress();
  const candidate = value as Partial<RunProgress>;
  const validIds = new Set(RUN_STATIONS.map((station) => station.id));
  const clearedStationIds = Array.isArray(candidate.clearedStationIds)
    ? [...new Set(candidate.clearedStationIds.filter((id): id is string => typeof id === "string" && validIds.has(id)))]
    : [];
  return {
    clearedStationIds,
    stationBonds: Math.max(0, Number(candidate.stationBonds) || 0),
    drivingBonusBonds: Math.max(0, Number(candidate.drivingBonusBonds) || 0),
    completionBonusBonds: Math.max(0, Number(candidate.completionBonusBonds) || 0),
    completed: candidate.completed === true && clearedStationIds.length === RUN_STATION_COUNT,
  };
}

export function normalizeCareerProgress(value: unknown): CareerProgress {
  if (!value || typeof value !== "object") return createCareerProgress();
  const candidate = value as Partial<CareerProgress>;
  return {
    completedRuns: Math.max(0, Math.floor(Number(candidate.completedRuns) || 0)),
    totalStationsCleared: Math.max(0, Math.floor(Number(candidate.totalStationsCleared) || 0)),
    lifetimeBondsEarned: Math.max(0, Math.floor(Number(candidate.lifetimeBondsEarned) || 0)),
    bestRunBonds: Math.max(0, Math.floor(Number(candidate.bestRunBonds) || 0)),
  };
}

export function consistRevenueMultiplier(carIds: readonly string[]) {
  const extraCars = Math.max(0, Math.min(3, carIds.length - 3));
  const premiumCars = carIds.filter((id) => id === "dining-car" || id === "observation-car").length;
  return Math.min(1.38, 1 + extraCars * 0.09 + premiumCars * 0.035);
}

export function stationBondPayout(
  baseBonds: number,
  engineBondMultiplier: number,
  carIds: readonly string[],
) {
  return Math.round(
    Math.max(0, baseBonds) *
    Math.max(1, engineBondMultiplier) *
    consistRevenueMultiplier(carIds),
  );
}

export function completionBondPayout(
  engineBondMultiplier: number,
  carIds: readonly string[],
) {
  return Math.round(
    RUN_COMPLETION_BASE_BONDS *
    Math.max(1, engineBondMultiplier) *
    consistRevenueMultiplier(carIds),
  );
}

export function recordStationProgress(
  progress: RunProgress,
  stationId: string,
  stationBonds: number,
  drivingBonusBonds: number,
): RunProgress {
  if (progress.clearedStationIds.includes(stationId)) return progress;
  return {
    ...progress,
    clearedStationIds: [...progress.clearedStationIds, stationId],
    stationBonds: progress.stationBonds + Math.max(0, Math.round(stationBonds)),
    drivingBonusBonds: progress.drivingBonusBonds + Math.max(0, Math.round(drivingBonusBonds)),
  };
}

export function canCompleteRun(progress: RunProgress) {
  return RUN_STATIONS.every((station) => progress.clearedStationIds.includes(station.id));
}

export function completeRun(progress: RunProgress, completionBonusBonds: number): RunProgress {
  if (!canCompleteRun(progress)) return progress;
  return {
    ...progress,
    completionBonusBonds: Math.max(0, Math.round(completionBonusBonds)),
    completed: true,
  };
}

export function totalRunBonds(progress: RunProgress) {
  return progress.stationBonds + progress.drivingBonusBonds + progress.completionBonusBonds;
}

export function recordCareerCompletion(career: CareerProgress, run: RunProgress): CareerProgress {
  if (!run.completed) return career;
  const runBonds = totalRunBonds(run);
  return {
    completedRuns: career.completedRuns + 1,
    totalStationsCleared: career.totalStationsCleared + run.clearedStationIds.length,
    lifetimeBondsEarned: career.lifetimeBondsEarned + runBonds,
    bestRunBonds: Math.max(career.bestRunBonds, runBonds),
  };
}
