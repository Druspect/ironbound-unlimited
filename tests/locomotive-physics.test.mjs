import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceBrakePressure,
  advanceLocomotive,
  boilerEquilibrium,
  LOCOMOTIVE_MODEL,
  targetSpeedForThrottle,
} from "../app/locomotive-physics.ts";

test("brake valve responds within a quarter second and releases promptly", () => {
  let pressure = 0;
  for (let i = 0; i < 5; i++) pressure = advanceBrakePressure(pressure, true, .05);
  assert.ok(pressure > .5 && pressure < .6, "brake builds progressively past half pressure in 250ms");
  assert.ok(advanceBrakePressure(0, true, 1 / 60) > .04, "input affects the very next frame");
  pressure = 1;
  for (let i = 0; i < 10; i++) pressure = advanceBrakePressure(pressure, false, .05);
  assert.ok(pressure < .13, "release does not keep fighting the regulator");
});

test("full brake-input pipeline stops predictably without an instant speed jump", () => {
  const simulateBraking = (fps) => {
    let pressure = 0;
    let state = { speed: 52, boilerLoad: 50, heat: 0, overloaded: false, safetyLockSeconds: 0, distance: 0 };
    let speedAtOneSecond;
    for (let i = 0; i < 15 * fps; i++) {
      pressure = advanceBrakePressure(pressure, true, 1 / fps);
      const before = state.speed;
      state = advanceLocomotive(state, 0, 1 / fps, 0, pressure);
      assert.ok(state.speed <= before && before - state.speed < 1, "continuous deceleration");
      if (i === fps - 1) speedAtOneSecond = state.speed;
    }
    assert.ok(speedAtOneSecond > 35 && speedAtOneSecond < 45);
    assert.equal(state.speed, 0);
    assert.ok(state.distance > .03 && state.distance < .06);
    return state;
  };
  assert.ok(Math.abs(simulateBraking(30).distance - simulateBraking(60).distance) < .0002);
});

function simulate(throttle, seconds, step = 0.05, gradePercent = 0.8) {
  let state = {
    speed: 0,
    boilerLoad: 42,
    heat: 0,
    overloaded: false,
    safetyLockSeconds: 0,
    distance: 0,
  };
  let overloadSeconds = 0;
  let maximumHeat = 0;
  const iterations = Math.round(seconds / step);

  for (let index = 0; index < iterations; index += 1) {
    state = advanceLocomotive(state, throttle, step, gradePercent);
    if (state.overloaded) overloadSeconds += step;
    maximumHeat = Math.max(maximumHeat, state.heat);
  }

  return {
    ...state,
    overloadSeconds,
    maximumHeat,
    averageSpeed: state.distance / (seconds / 3600),
  };
}

test("the fastest thermally sustainable nominal setting is below full steam", () => {
  const candidates = Array.from({ length: 101 }, (_, throttle) => ({
    throttle,
    target: targetSpeedForThrottle(throttle, false),
    boiler: boilerEquilibrium(throttle, false),
  })).filter((candidate) => candidate.boiler <= LOCOMOTIVE_MODEL.heatThreshold);
  const fastest = candidates.reduce((best, candidate) =>
    candidate.target > best.target ? candidate : best,
  );

  assert.equal(fastest.throttle, 91);
  assert.ok(fastest.target > targetSpeedForThrottle(100, false));
  assert.ok(fastest.boiler <= LOCOMOTIVE_MODEL.heatThreshold);
});

test("slow and steady operation remains thermally stable", () => {
  const run = simulate(58, 120);

  assert.equal(run.overloadSeconds, 0);
  assert.ok(run.boilerLoad < 65);
  assert.equal(run.maximumHeat, 0);
  assert.ok(run.averageSpeed > 49);
});

test("holding full steam fills heat, trips the governor, and loses the run", () => {
  const fullSteam = simulate(100, 120);
  const fastLine = simulate(91, 120);

  assert.ok(fullSteam.overloadSeconds > 20);
  assert.equal(fullSteam.maximumHeat, 100);
  assert.equal(fastLine.overloadSeconds, 0);
  assert.ok(fastLine.distance > fullSteam.distance * 1.15);
});

test("heat rises only while the boiler is above ninety percent", () => {
  const warm = advanceLocomotive({
    speed: 50,
    boilerLoad: 89,
    heat: 40,
    overloaded: false,
    safetyLockSeconds: 0,
    distance: 0,
  }, 0, 0.1, 0);
  const hot = advanceLocomotive({
    speed: 50,
    boilerLoad: 96,
    heat: 40,
    overloaded: false,
    safetyLockSeconds: 0,
    distance: 0,
  }, 100, 0.1, 0);

  assert.ok(warm.heat < 40);
  assert.ok(hot.heat > 40);
});

test("the safety lock caps demand at ten percent and cannot clear early", () => {
  const cap = LOCOMOTIVE_MODEL.maximumSpeed * LOCOMOTIVE_MODEL.safetySpeedFraction;
  assert.equal(targetSpeedForThrottle(100, true, 0), cap);

  let state = {
    speed: 55,
    boilerLoad: 100,
    heat: 100,
    overloaded: true,
    safetyLockSeconds: LOCOMOTIVE_MODEL.minimumSafetyLockSeconds,
    distance: 0,
  };
  for (let elapsed = 0; elapsed < 10; elapsed += 0.05) {
    state = advanceLocomotive(state, 100, 0.05, 0);
  }
  assert.equal(state.overloaded, true);
  assert.ok(state.safetyLockSeconds >= 7.9);

  for (let elapsed = 10; elapsed < 30; elapsed += 0.05) {
    state = advanceLocomotive(state, 0, 0.05, 0);
  }
  assert.equal(state.overloaded, false);
  assert.ok(state.speed <= cap + 0.2);
});

test("climbing increases steam demand and reduces attainable speed", () => {
  assert.ok(boilerEquilibrium(70, false, 2.5) > boilerEquilibrium(70, false, -2.5));
  assert.ok(targetSpeedForThrottle(70, false, 2.5) < targetSpeedForThrottle(70, false, -2.5));
});

test("locomotive profiles set real speed ceilings and consist response", () => {
  assert.ok(
    targetSpeedForThrottle(91, false, 0, { maximumSpeed: 105, accelerationFactor: 1.2 }) >
    targetSpeedForThrottle(91, false, 0, { maximumSpeed: 70, accelerationFactor: .8 }),
  );

  const initial = { speed: 0, boilerLoad: 42, heat: 0, overloaded: false, safetyLockSeconds: 0, distance: 0 };
  const light = advanceLocomotive(initial, 70, .1, 0, 0, { maximumSpeed: 80, accelerationFactor: 1.4 });
  const heavy = advanceLocomotive(initial, 70, .1, 0, 0, { maximumSpeed: 80, accelerationFactor: .65 });
  assert.ok(light.speed > heavy.speed);
});

test("service braking slows progressively, covers stopping distance, and then holds", () => {
  const initial = {
    speed: 42,
    boilerLoad: 42,
    heat: 0,
    overloaded: false,
    safetyLockSeconds: 0,
    distance: 0,
  };
  let braking = initial;
  let coasting = initial;

  for (let elapsed = 0; elapsed < 1; elapsed += 0.05) {
    braking = advanceLocomotive(braking, 0, 0.05, 0, 1);
  }
  assert.ok(braking.speed > 20 && braking.speed < initial.speed);
  assert.ok(braking.distance > 0);

  for (let elapsed = 1; elapsed < 6; elapsed += 0.05) {
    braking = advanceLocomotive(braking, 0, 0.05, 0, 1);
  }
  for (let elapsed = 0; elapsed < 6; elapsed += 0.05) {
    coasting = advanceLocomotive(coasting, 0, 0.05, 0, 0);
  }
  assert.ok(braking.speed < coasting.speed);

  for (let elapsed = 6; elapsed < 24; elapsed += 0.05) {
    braking = advanceLocomotive(braking, 0, 0.05, 0, 1);
  }
  assert.equal(braking.speed, 0);
});

test("integration stays effectively frame-rate independent", () => {
  const twentyFps = simulate(91, 90, 0.05);
  const sixtyFps = simulate(91, 90, 1 / 60);

  assert.ok(Math.abs(twentyFps.speed - sixtyFps.speed) < 0.05);
  assert.ok(Math.abs(twentyFps.boilerLoad - sixtyFps.boilerLoad) < 0.05);
  assert.ok(Math.abs(twentyFps.heat - sixtyFps.heat) < 0.05);
  assert.ok(Math.abs(twentyFps.distance - sixtyFps.distance) < 0.002);
});
