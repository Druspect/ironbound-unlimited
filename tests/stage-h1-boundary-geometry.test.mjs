import assert from "node:assert/strict";
import test from "node:test";

import {
  COACH_COUPLING_CLEARANCE_FEET,
  COACH_COUPLING_GAP,
  COACH_TO_TENDER_CLEARANCE_FEET,
  ENGINE_COUPLING_GAP,
  WORLD_PIXELS_PER_FOOT,
  calculateConsistBoundaryGeometry,
} from "../app/consist-boundary-geometry.ts";
import {
  CANONICAL_COACH_LENGTH_FEET,
  CANONICAL_COACH_RENDER_WIDTH,
  engineRenderWidth,
  FLEET_PROPORTIONS,
} from "../app/fleet-proportions.ts";

const CAR = CANONICAL_COACH_RENDER_WIDTH;

test("H1 clearances remain tied to the canonical 80 ft coach scale", () => {
  assert.equal(WORLD_PIXELS_PER_FOOT, CAR / CANONICAL_COACH_LENGTH_FEET);
  assert.equal(COACH_COUPLING_GAP, COACH_COUPLING_CLEARANCE_FEET * WORLD_PIXELS_PER_FOOT);
  assert.equal(ENGINE_COUPLING_GAP, COACH_TO_TENDER_CLEARANCE_FEET * WORLD_PIXELS_PER_FOOT);

  assert.ok(COACH_COUPLING_GAP < CAR * 0.05, "coach gap must remain close-coupled");
  assert.ok(ENGINE_COUPLING_GAP < CAR * 0.06, "coach-to-tender gap must not read as a detached vehicle");
  assert.ok(ENGINE_COUPLING_GAP > COACH_COUPLING_GAP, "fleet-variable tender boundary needs modestly greater clearance");
});

test("every 3-6 car consist reserves each boundary exactly once", () => {
  for (const carCount of [3, 4, 5, 6]) {
    for (const engineId of Object.keys(FLEET_PROPORTIONS)) {
      const engineWidth = engineRenderWidth(engineId);
      const geometry = calculateConsistBoundaryGeometry(carCount, CAR, engineWidth);

      assert.equal(geometry.carLeftOffsets.length, carCount);
      assert.equal(geometry.carLeftOffsets[0], 0);
      for (let index = 1; index < carCount; index++) {
        const precedingRight = geometry.carLeftOffsets[index - 1] + CAR;
        const gap = geometry.carLeftOffsets[index] - precedingRight;
        assert.ok(Math.abs(gap - COACH_COUPLING_GAP) < 1e-9, `${engineId} car ${index} gap`);
      }

      const lastCarRight = geometry.carLeftOffsets.at(-1) + CAR;
      assert.ok(Math.abs(lastCarRight - geometry.passengerWorldWidth) < 1e-9);
      assert.ok(Math.abs(geometry.engineLeft - lastCarRight - ENGINE_COUPLING_GAP) < 1e-9);
      assert.ok(Math.abs(geometry.trainWorldWidth - geometry.engineLeft - engineWidth) < 1e-9);
    }
  }
});

test("H1 rejects malformed geometry instead of silently normalizing it", () => {
  for (const badCount of [0, 2, 2.5, 7, Number.NaN]) {
    assert.throws(() => calculateConsistBoundaryGeometry(badCount, CAR, 200));
  }
  for (const badWidth of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => calculateConsistBoundaryGeometry(3, badWidth, 200));
    assert.throws(() => calculateConsistBoundaryGeometry(3, CAR, badWidth));
  }
});
