export const OPTIMAL_SPEED_MIN = 48;
export const OPTIMAL_SPEED_MAX = 56;
export const SAFE_DRIVING_DISTANCE_SHARE = 0.7;

export type SafeDrivingProgress = {
  totalDistance: number;
  optimalDistance: number;
};

export const createSafeDrivingProgress = (): SafeDrivingProgress => ({
  totalDistance: 0,
  optimalDistance: 0,
});

export const isOptimalSpeed = (speed: number) =>
  speed >= OPTIMAL_SPEED_MIN && speed <= OPTIMAL_SPEED_MAX;

export function recordSafeDrivingDistance(
  progress: SafeDrivingProgress,
  distanceDelta: number,
  speed: number,
): SafeDrivingProgress {
  const traveled = Math.max(0, distanceDelta);
  if (traveled === 0) return progress;

  return {
    totalDistance: progress.totalDistance + traveled,
    optimalDistance: progress.optimalDistance +
      (isOptimalSpeed(speed) ? traveled : 0),
  };
}

export const safeDrivingShare = (progress: SafeDrivingProgress) =>
  progress.totalDistance > 0
    ? progress.optimalDistance / progress.totalDistance
    : 0;

/** A modest, unmultiplied station bonus keeps engine upgrades meaningful. */
export function safeDrivingBonus(
  baseStationBonds: number,
  progress: SafeDrivingProgress,
) {
  if (safeDrivingShare(progress) <= SAFE_DRIVING_DISTANCE_SHARE) return 0;
  return Math.max(15, Math.round(Math.max(0, baseStationBonds) * 0.08));
}
