import assert from "node:assert/strict";
import test from "node:test";

import { advanceBrakePressure, advanceLocomotive } from "../app/locomotive-physics.ts";
import { DEFAULT_CONSIST, calculateConsistMetrics } from "../app/steam-operations.ts";

const LONG_CONSIST = [...DEFAULT_CONSIST, "dining-car", "day-coach", "observation-car"];

const initialState = () => ({
  speed: 45,
  boilerLoad: 42,
  heat: 0,
  overloaded: false,
  safetyLockSeconds: 0,
  distance: 0,
});

function applyFor(metrics, seconds) {
  let state = initialState();
  let linePressure = 0;
  for (let elapsed = 0; elapsed < seconds; elapsed += .05) {
    linePressure = advanceBrakePressure(linePressure, true, .05);
    state = advanceLocomotive(state, 0, .05, 0, linePressure, {
      brakeResponseFactor: metrics.brakeResponseFactor,
      brakeRiggingFactor: 1,
    });
  }
  return { state, linePressure };
}

function releaseFor(metrics, seconds) {
  let state = { ...initialState(), brakeCylinderPressure: 1 };
  let linePressure = 1;
  for (let elapsed = 0; elapsed < seconds; elapsed += .05) {
    linePressure = advanceBrakePressure(linePressure, false, .05);
    state = advanceLocomotive(state, 0, .05, 0, linePressure, {
      brakeResponseFactor: metrics.brakeResponseFactor,
      brakeRiggingFactor: 1,
    });
  }
  return { state, linePressure };
}

test("six-car consists build effective brake-cylinder pressure more slowly than three-car consists", () => {
  const shortMetrics = calculateConsistMetrics("southern-4501", DEFAULT_CONSIST);
  const longMetrics = calculateConsistMetrics("southern-4501", LONG_CONSIST);
  const short = applyFor(shortMetrics, .6);
  const long = applyFor(longMetrics, .6);

  assert.ok(longMetrics.brakeResponseFactor > shortMetrics.brakeResponseFactor);
  assert.ok(short.state.brakeCylinderPressure > long.state.brakeCylinderPressure + .02,
    `${short.state.brakeCylinderPressure} should materially exceed ${long.state.brakeCylinderPressure}`);
  assert.ok(short.state.speed < long.state.speed,
    "the shorter train must begin slowing sooner under the same engineer command");
  assert.ok(Math.abs(short.linePressure - long.linePressure) < 1e-12,
    "engineer valve pressure is identical; the difference belongs in trainline propagation");
});

test("six-car consists release effective brake-cylinder pressure more slowly than three-car consists", () => {
  const shortMetrics = calculateConsistMetrics("southern-4501", DEFAULT_CONSIST);
  const longMetrics = calculateConsistMetrics("southern-4501", LONG_CONSIST);
  const short = releaseFor(shortMetrics, .6);
  const long = releaseFor(longMetrics, .6);

  assert.ok(long.state.brakeCylinderPressure > short.state.brakeCylinderPressure + .02,
    `${long.state.brakeCylinderPressure} should materially exceed ${short.state.brakeCylinderPressure}`);
  assert.ok(Math.abs(short.linePressure - long.linePressure) < 1e-12,
    "valve release remains the same while the longer trainline bleeds down more slowly");
});

test("consist response affects propagation, not fully-set steady brake strength", () => {
  const shortMetrics = calculateConsistMetrics("southern-4501", DEFAULT_CONSIST);
  const longMetrics = calculateConsistMetrics("southern-4501", LONG_CONSIST);
  const fullyApplied = { ...initialState(), brakeCylinderPressure: 1 };

  const short = advanceLocomotive(fullyApplied, 0, .1, 0, 1, {
    brakeResponseFactor: shortMetrics.brakeResponseFactor,
    brakeRiggingFactor: 1,
  });
  const long = advanceLocomotive(fullyApplied, 0, .1, 0, 1, {
    brakeResponseFactor: longMetrics.brakeResponseFactor,
    brakeRiggingFactor: 1,
  });

  assert.ok(Math.abs(short.speed - long.speed) < 1e-10,
    "once every brake cylinder is fully applied, trainline length cannot remain a hidden brake-strength penalty");
});
