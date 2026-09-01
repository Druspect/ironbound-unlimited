import assert from "node:assert/strict";
import test from "node:test";

import {
  createSafeDrivingProgress,
  isOptimalSpeed,
  recordSafeDrivingDistance,
  safeDrivingBonus,
  safeDrivingShare,
} from "../app/run-economy.ts";

test("safe driving is measured by distance, not elapsed samples", () => {
  let progress = createSafeDrivingProgress();
  progress = recordSafeDrivingDistance(progress, 700, 52);
  progress = recordSafeDrivingDistance(progress, 300, 72);
  progress = recordSafeDrivingDistance(progress, 0, 52);

  assert.equal(safeDrivingShare(progress), 0.7);
  assert.equal(safeDrivingBonus(250, progress), 0);

  progress = recordSafeDrivingDistance(progress, 2, 52);
  assert.ok(safeDrivingShare(progress) > 0.7);
  assert.equal(safeDrivingBonus(250, progress), 20);
});

test("the target band is inclusive and the bonus remains modest", () => {
  assert.equal(isOptimalSpeed(48), true);
  assert.equal(isOptimalSpeed(56), true);
  assert.equal(isOptimalSpeed(47.99), false);
  assert.equal(isOptimalSpeed(56.01), false);

  const allSafe = { totalDistance: 1000, optimalDistance: 1000 };
  assert.equal(safeDrivingBonus(100, allSafe), 15);
  assert.equal(safeDrivingBonus(900, allSafe), 72);
});
