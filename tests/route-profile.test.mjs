import assert from "node:assert/strict";
import test from "node:test";

import {
  ROUTE_ELEVATIONS_FEET,
  ROUTE_TILE_TRAVEL,
  ROUTE_TRAVEL_LENGTH,
  sampleRouteProfile,
} from "../app/route-profile.ts";

test("the route contains meaningful climbs and descents", () => {
  const samples = Array.from({ length: 48 }, (_, index) =>
    sampleRouteProfile(index * ROUTE_TRAVEL_LENGTH / 48),
  );

  assert.ok(Math.max(...samples.map((sample) => sample.gradePercent)) > 2);
  assert.ok(Math.min(...samples.map((sample) => sample.gradePercent)) < -2);
  assert.ok(sampleRouteProfile(22 * ROUTE_TILE_TRAVEL).elevationFeet >
    sampleRouteProfile(0).elevationFeet + 500);
});

test("elevation and grade stay continuous at every tile boundary", () => {
  const epsilon = 0.001;
  for (let tile = 0; tile < ROUTE_ELEVATIONS_FEET.length; tile += 1) {
    const boundary = tile * ROUTE_TILE_TRAVEL;
    const before = sampleRouteProfile(boundary - epsilon);
    const after = sampleRouteProfile(boundary + epsilon);
    assert.ok(Math.abs(before.elevationFeet - after.elevationFeet) < 0.01);
    assert.ok(Math.abs(before.gradePercent - after.gradePercent) < 0.01);
  }
});

test("the final map rejoins the first without a route-loop jump", () => {
  const start = sampleRouteProfile(0);
  const wrapped = sampleRouteProfile(ROUTE_TRAVEL_LENGTH);

  assert.deepEqual(wrapped, start);
});
