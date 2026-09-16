import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EXHAUST_TRAVEL_CALIBRATION,
  routeTravelFromExhaustMotion,
} from "../app/locomotive-exhaust.ts";
import { sampleRouteProfile } from "../app/route-profile.ts";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const exhaustViewSource = await readFile(new URL("../app/locomotive-exhaust-view.tsx", import.meta.url), "utf8");

test("exhaust travel calibration stays locked to the driver travel used by page motion", () => {
  const match = pageSource.match(/const WHEEL_TRAVEL_CALIBRATION = ([\d.]+);/);
  assert.ok(match, "page wheel-travel calibration is missing");
  assert.equal(Number(match[1]), EXHAUST_TRAVEL_CALIBRATION);
});

test("sanding presentation reconstructs the same route grade from calibrated rail travel", () => {
  for (const routeTravel of [0, 0.82 * 1150, 5.82 * 1150, 15.82 * 1150, 20.82 * 1150, 25.82 * 1150]) {
    const motionTravel = routeTravel * EXHAUST_TRAVEL_CALIBRATION;
    const reconstructed = routeTravelFromExhaustMotion(motionTravel);
    assert.ok(Math.abs(reconstructed - routeTravel) < 1e-9);
    assert.equal(sampleRouteProfile(reconstructed).gradePercent, sampleRouteProfile(routeTravel).gradePercent);
  }
});

test("rendered sanding uses reconstructed route grade instead of a flat-track constant", () => {
  assert.match(exhaustViewSource, /const routeGradePercent = sampleRouteProfile\(routeTravel\)\.gradePercent;/);
  assert.match(exhaustViewSource, /automaticSandingState\([\s\S]*?currentMotion\.load \* 100,[\s\S]*?routeGradePercent,[\s\S]*?operatingProfile\.adhesionFactor/);
  assert.doesNotMatch(exhaustViewSource, /automaticSandingState\([\s\S]{0,160}?currentMotion\.load \* 100,\s*0,\s*operatingProfile\.adhesionFactor/);
});
