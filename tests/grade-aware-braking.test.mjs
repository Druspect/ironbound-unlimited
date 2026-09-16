import assert from "node:assert/strict";
import test from "node:test";

import { advanceBrakePressure, advanceLocomotive } from "../app/locomotive-physics.ts";

function simulateServiceStop(gradePercent) {
  let pressure = 0;
  let elapsed = 0;
  let state = {
    speed: 42,
    boilerLoad: 42,
    heat: 0,
    overloaded: false,
    safetyLockSeconds: 0,
    distance: 0,
  };

  while (state.speed > 0 && elapsed < 30) {
    pressure = advanceBrakePressure(pressure, true, .05);
    state = advanceLocomotive(state, 0, .05, gradePercent, pressure);
    elapsed += .05;
  }

  assert.equal(state.speed, 0, `service brake must stop the train on ${gradePercent}% grade`);
  return { elapsed, distance: state.distance };
}

test("route grade remains active through a full service-brake stop", () => {
  const downgrade = simulateServiceStop(-3.5);
  const level = simulateServiceStop(0);
  const upgrade = simulateServiceStop(3.5);

  assert.ok(
    downgrade.distance > level.distance * 1.10,
    `downgrade stopping distance ${downgrade.distance} must materially exceed level ${level.distance}`,
  );
  assert.ok(
    level.distance > upgrade.distance * 1.10,
    `level stopping distance ${level.distance} must materially exceed upgrade ${upgrade.distance}`,
  );
  assert.ok(downgrade.elapsed > level.elapsed + 1, "downgrade must take longer to stop than level track");
  assert.ok(level.elapsed > upgrade.elapsed + 1, "upgrade must help the train stop sooner than level track");
});

test("level-track stopping calibration stays inside the established envelope", () => {
  const level = simulateServiceStop(0);

  assert.ok(level.elapsed > 12 && level.elapsed < 15, `unexpected level stopping time ${level.elapsed}s`);
  assert.ok(level.distance > .03 && level.distance < .05, `unexpected level stopping distance ${level.distance}mi`);
});

test("braking response changes monotonically across ordinary route grades", () => {
  const downgrade = simulateServiceStop(-2);
  const level = simulateServiceStop(0);
  const upgrade = simulateServiceStop(2);

  assert.ok(downgrade.distance > level.distance);
  assert.ok(level.distance > upgrade.distance);
  assert.ok(downgrade.elapsed > level.elapsed);
  assert.ok(level.elapsed > upgrade.elapsed);
});
