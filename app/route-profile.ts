export const ROUTE_TILE_TRAVEL = 1150;
export const ROUTE_FEET_PER_TRAVEL_UNIT = 3.45;

// One surveyed elevation at each route-tile boundary. The cyclic spline keeps
// the grade continuous across biome seams and across the end of the route.
// Five surveyed tiles per biome keep each landscape on screen long enough to
// read as a place. The new Salt Flats descend before Pine Divide and Alpine
// Pass climb; River Basin then returns the line gently to the plains.
export const ROUTE_ELEVATIONS_FEET = Object.freeze([
  3540, 3550, 3560, 3555, 3570,
  3600, 3650, 3710, 3760, 3790,
  3760, 3700, 3630, 3570, 3540,
  3580, 3650, 3730, 3820, 3890,
  3970, 4050, 4120, 4090, 4010,
  3920, 3820, 3720, 3630, 3560,
] as const);

export const ROUTE_TRAVEL_LENGTH =
  ROUTE_ELEVATIONS_FEET.length * ROUTE_TILE_TRAVEL;

export type RouteProfileSample = {
  elevationFeet: number;
  gradePercent: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const wrap = (value: number, modulus: number) =>
  ((value % modulus) + modulus) % modulus;

/**
 * Samples a periodic Catmull-Rom survey. Both elevation and its derivative are
 * continuous at every tile/biome boundary, preventing sudden boiler jumps.
 */
export function sampleRouteProfile(routeTravel: number): RouteProfileSample {
  const wrappedTravel = wrap(routeTravel, ROUTE_TRAVEL_LENGTH);
  const tilePosition = wrappedTravel / ROUTE_TILE_TRAVEL;
  const tileIndex = Math.floor(tilePosition);
  const t = tilePosition - tileIndex;
  const count = ROUTE_ELEVATIONS_FEET.length;
  const elevationAt = (index: number) =>
    ROUTE_ELEVATIONS_FEET[wrap(index, count)];

  const p0 = elevationAt(tileIndex - 1);
  const p1 = elevationAt(tileIndex);
  const p2 = elevationAt(tileIndex + 1);
  const p3 = elevationAt(tileIndex + 2);
  const t2 = t * t;
  const t3 = t2 * t;

  const elevationFeet = 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );

  const elevationDerivative = 0.5 * (
    (-p0 + p2) +
    2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t +
    3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t2
  );
  const horizontalFeetPerTile =
    ROUTE_TILE_TRAVEL * ROUTE_FEET_PER_TRAVEL_UNIT;
  const gradePercent = clamp(
    elevationDerivative / horizontalFeetPerTile * 100,
    -3.5,
    3.5,
  );

  return { elevationFeet, gradePercent };
}
