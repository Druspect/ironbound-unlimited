import assert from "node:assert/strict";
import test from "node:test";

import { advanceLocomotive } from "../app/locomotive-physics.ts";

function stopFrom(speedMph, gradePercent, brakeResponseFactor, brakeRiggingFactor) {
  let state = {
    speed: speedMph,
    boilerLoad: 50,
    heat: 0,
    overloaded: false,
    safetyLockSeconds: 0,
    distance: 0,
    brakeCylinderPressure: 0,
  };

  for (let step = 0; step < 2_000 && state.speed > 0; step += 1) {
    state = advanceLocomotive(state, 0, .05, gradePercent, 1, {
      maximumSpeed: 90,
      brakeResponseFactor,
      brakeRiggingFactor,
    });
  }
  return state.distance;
}

test("locomotive brake rigging matters less as independently braked consist length grows", () => {
  const shortWeak = stopFrom(45, 0, .95, .76);
  const shortStrong = stopFrom(45, 0, .95, 1.16);
  const longWeak = stopFrom(45, 0, 1.50, .76);
  const longStrong = stopFrom(45, 0, 1.50, 1.16);

  const shortSpread = shortWeak - shortStrong;
  const longSpread = longWeak - longStrong;

  assert.ok(shortSpread > 0, "strong locomotive rigging should still shorten a short train stop");
  assert.ok(longSpread > 0, "engine identity should not disappear entirely on a long train");
  assert.ok(longSpread < shortSpread * .65, "coach brakes should dominate more of the long-train stop");
});

test("neutral locomotive rigging leaves consist propagation as the braking differentiator", () => {
  const shortTrain = stopFrom(45, 0, .95, 1);
  const longTrain = stopFrom(45, 0, 1.50, 1);

  assert.ok(longTrain > shortTrain, "slower trainline propagation must lengthen the long-train stop");
});

test("grade ordering survives consist-aware brake authority", () => {
  for (const brakeResponseFactor of [.95, 1.50]) {
    const uphill = stopFrom(45, 3.5, brakeResponseFactor, .82);
    const level = stopFrom(45, 0, brakeResponseFactor, .82);
    const downhill = stopFrom(45, -3.5, brakeResponseFactor, .82);

    assert.ok(uphill < level, "upgrade should shorten the stop");
    assert.ok(level < downhill, "downgrade should lengthen the stop");
  }
});
