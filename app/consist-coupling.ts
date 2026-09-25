/**
 * Stage H coupling geometry
 * -------------------------
 * Mechanical interfaces need dedicated world-space. Sprite transparency is not
 * allowed to determine vehicle separation because that makes couplers vanish
 * into artwork margins.
 */
export const COACH_COUPLING_GAP = 14;
export const ENGINE_COUPLING_GAP = 18;
export const MAX_VISUAL_SLACK_PX = 2.4;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function passengerConsistWorldWidth(carCount: number, carWidth: number) {
  const cars = Math.max(1, Math.floor(carCount));
  return cars * carWidth + (cars - 1) * COACH_COUPLING_GAP;
}

export function passengerCarLeftOffset(carIndex: number, carWidth: number) {
  return Math.max(0, Math.floor(carIndex)) * (carWidth + COACH_COUPLING_GAP);
}

export function engineLeftOffset(carCount: number, carWidth: number) {
  return passengerConsistWorldWidth(carCount, carWidth) + ENGINE_COUPLING_GAP;
}

export function totalTrainWorldWidth(carCount: number, carWidth: number, engineWidth: number) {
  return engineLeftOffset(carCount, carWidth) + Math.max(0, engineWidth);
}

/**
 * Visual draft slack only. Vehicle geometry remains fixed so wheel/rail and
 * platform contracts cannot be disturbed by throttle or brake transitions.
 */
export function couplingSlackOffset(throttlePercent: number, brakePressure: number) {
  const pull = clamp(throttlePercent, 0, 100) / 100;
  const compression = clamp(brakePressure, 0, 1);
  return clamp((pull - compression) * MAX_VISUAL_SLACK_PX, -MAX_VISUAL_SLACK_PX, MAX_VISUAL_SLACK_PX);
}
