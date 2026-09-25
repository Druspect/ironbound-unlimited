/**
 * Stage H1: consist boundary geometry
 * -----------------------------------
 * Ironbound already has a canonical physical scale:
 *   80 ft heavyweight coach = 190 world px.
 *
 * Coupling clearances are therefore defined in world feet first and converted
 * through that same scale. They are deliberate visual/mechanical baselines,
 * not claims that every railroad used one universal prototype dimension.
 */
import {
  CANONICAL_COACH_LENGTH_FEET,
  CANONICAL_COACH_RENDER_WIDTH,
} from "./fleet-proportions.ts";

export const WORLD_PIXELS_PER_FOOT =
  CANONICAL_COACH_RENDER_WIDTH / CANONICAL_COACH_LENGTH_FEET;

/**
 * Passenger diaphragms should read close-coupled while still leaving enough
 * world-space for a visible draft-gear bridge. 3.25 ft is 4.0625% of the
 * canonical 80 ft coach body.
 */
export const COACH_COUPLING_CLEARANCE_FEET = 3.25;

/**
 * The last coach-to-tender boundary gets modestly more clearance because the
 * tender end geometry varies across the fleet.
 */
export const COACH_TO_TENDER_CLEARANCE_FEET = 4;

export const COACH_COUPLING_GAP =
  COACH_COUPLING_CLEARANCE_FEET * WORLD_PIXELS_PER_FOOT;
export const ENGINE_COUPLING_GAP =
  COACH_TO_TENDER_CLEARANCE_FEET * WORLD_PIXELS_PER_FOOT;

export type ConsistBoundaryGeometry = Readonly<{
  carCount: number;
  carWidth: number;
  coachCouplingGap: number;
  engineCouplingGap: number;
  carLeftOffsets: readonly number[];
  passengerWorldWidth: number;
  engineLeft: number;
  engineWidth: number;
  trainWorldWidth: number;
}>;

function assertPositiveFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number; received ${value}`);
  }
}

function assertSupportedCarCount(carCount: number) {
  if (!Number.isInteger(carCount) || carCount < 3 || carCount > 6) {
    throw new Error(`Ironbound consists require 3-6 passenger cars; received ${carCount}`);
  }
}

/**
 * Returns the complete horizontal world geometry for one rendered consist.
 *
 * Important invariants:
 * - car artwork width never changes;
 * - coupling clearances are inserted only between vehicle boxes;
 * - engine width remains the fleet-proportion width already audited elsewhere;
 * - total width includes every reserved mechanical boundary exactly once.
 */
export function calculateConsistBoundaryGeometry(
  carCount: number,
  carWidth: number,
  engineWidth: number,
): ConsistBoundaryGeometry {
  assertSupportedCarCount(carCount);
  assertPositiveFinite(carWidth, "carWidth");
  assertPositiveFinite(engineWidth, "engineWidth");

  const carLeftOffsets = Array.from(
    { length: carCount },
    (_, index) => index * (carWidth + COACH_COUPLING_GAP),
  );
  const passengerWorldWidth =
    carCount * carWidth + (carCount - 1) * COACH_COUPLING_GAP;
  const engineLeft = passengerWorldWidth + ENGINE_COUPLING_GAP;
  const trainWorldWidth = engineLeft + engineWidth;

  return Object.freeze({
    carCount,
    carWidth,
    coachCouplingGap: COACH_COUPLING_GAP,
    engineCouplingGap: ENGINE_COUPLING_GAP,
    carLeftOffsets: Object.freeze(carLeftOffsets),
    passengerWorldWidth,
    engineLeft,
    engineWidth,
    trainWorldWidth,
  });
}
