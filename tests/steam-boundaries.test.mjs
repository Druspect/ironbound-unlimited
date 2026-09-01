import assert from "node:assert/strict";
import test from "node:test";

import { LOCOMOTIVES } from "../app/locomotive-catalog.ts";
import { advanceLocomotive } from "../app/locomotive-physics.ts";
import {
  DEFAULT_CONSIST,
  advanceSteamResources,
  calculateConsistMetrics,
  calculateServiceDurationSeconds,
  createSteamResourceState,
  operatingProfileFor,
  recordPassedStation,
} from "../app/steam-operations.ts";

const LONG_CONSIST = [...DEFAULT_CONSIST, "dining-car", "pullman", "baggage-mail"];

test("every engine responds strictly and monotonically to three additional loaded cars", () => {
  for (const engine of LOCOMOTIVES) {
    const short = calculateConsistMetrics(engine.id, DEFAULT_CONSIST);
    const long = calculateConsistMetrics(engine.id, LONG_CONSIST);
    assert.ok(long.totalTrainTons > short.totalTrainTons, `${engine.id} mass`);
    assert.ok(long.accelerationFactor < short.accelerationFactor, `${engine.id} acceleration`);
    assert.ok(long.brakeResponseFactor > short.brakeResponseFactor, `${engine.id} braking`);
    assert.ok(long.resourceLoadFactor > short.resourceLoadFactor, `${engine.id} resources`);
    assert.ok(long.maximumSpeedFactor < short.maximumSpeedFactor, `${engine.id} loaded speed`);
    assert.ok(long.maximumSpeedFactor >= .72 && short.maximumSpeedFactor <= 1);
  }
});

test("a hot stationary locomotive still consumes fuel and water", () => {
  const profile = operatingProfileFor("southern-4501");
  const metrics = calculateConsistMetrics(profile.id, DEFAULT_CONSIST);
  const next = advanceSteamResources(createSteamResourceState(), profile, metrics, { throttle: 65, boilerLoad: 78, heat: 84, speed: 0 }, .1);
  assert.ok(next.fuel < 100);
  assert.ok(next.water < 100);
});

test("overheating more than doubles boiler-water loss at equal demand", () => {
  const profile = operatingProfileFor("nw-611");
  const metrics = calculateConsistMetrics(profile.id, DEFAULT_CONSIST);
  const cool = advanceSteamResources(createSteamResourceState(), profile, metrics, { throttle: 70, boilerLoad: 85, heat: 35, speed: 60 }, .1);
  const hot = advanceSteamResources(createSteamResourceState(), profile, metrics, { throttle: 70, boilerLoad: 85, heat: 100, speed: 60 }, .1);
  assert.ok((100 - hot.water) > (100 - cool.water) * 2.4);
  assert.equal(hot.fuel, cool.fuel);
});

test("service time has hard bounds and grows with depletion, missed stops, and consist length", () => {
  const short = calculateConsistMetrics("tom-thumb", DEFAULT_CONSIST);
  const long = calculateConsistMetrics("tom-thumb", LONG_CONSIST);
  const ready = createSteamResourceState();
  const depleted = { fuel: 18, water: 9, stationsWithoutService: 3, failure: null };
  assert.equal(calculateServiceDurationSeconds(ready, short), 2.4);
  assert.ok(calculateServiceDurationSeconds(depleted, short) > calculateServiceDurationSeconds(ready, short));
  assert.ok(calculateServiceDurationSeconds(depleted, long) > calculateServiceDurationSeconds(depleted, short));
  assert.ok(calculateServiceDurationSeconds(depleted, long) <= 10);
});

test("the service boundary ends a run on the fourth missed station, not before", () => {
  let resources = createSteamResourceState();
  for (let station = 1; station <= 3; station += 1) {
    resources = recordPassedStation(resources);
    assert.equal(resources.failure, null, `station ${station}`);
  }
  resources = recordPassedStation(resources);
  assert.equal(resources.failure, "service");
  assert.equal(resources.stationsWithoutService, 4);
});

test("a longer consist reaches a lower sustainable speed under identical controls", () => {
  const profile = operatingProfileFor("nkp-765");
  const shortMetrics = calculateConsistMetrics(profile.id, DEFAULT_CONSIST);
  const longMetrics = calculateConsistMetrics(profile.id, LONG_CONSIST);
  const run = (metrics) => {
    let state = { speed: 0, boilerLoad: 42, heat: 0, overloaded: false, safetyLockSeconds: 0, distance: 0 };
    for (let step = 0; step < 2_400; step += 1) {
      state = advanceLocomotive(state, 48, .1, 0, 0, {
        maximumSpeed: profile.maximumSpeedMph * metrics.maximumSpeedFactor,
        accelerationFactor: metrics.accelerationFactor,
        brakeResponseFactor: metrics.brakeResponseFactor,
        thermalLoadFactor: metrics.resourceLoadFactor / profile.thermalEfficiency,
      });
    }
    return state;
  };
  const short = run(shortMetrics);
  const long = run(longMetrics);
  assert.ok(short.speed > long.speed + 2, `${short.speed} should materially exceed ${long.speed}`);
});

test("thirty simulated minutes never produce non-finite or out-of-range resource state", () => {
  for (const engine of LOCOMOTIVES) {
    const profile = operatingProfileFor(engine.id);
    const metrics = calculateConsistMetrics(engine.id, LONG_CONSIST);
    let resources = createSteamResourceState();
    for (let step = 0; step < 18_000; step += 1) {
      resources = advanceSteamResources(resources, profile, metrics, { throttle: 58, boilerLoad: 72, heat: step % 900 > 700 ? 94 : 48, speed: profile.cruiseSpeedMph }, .1);
      for (const value of [resources.fuel, resources.water, resources.stationsWithoutService]) assert.ok(Number.isFinite(value));
      assert.ok(resources.fuel >= 0 && resources.fuel <= 100);
      assert.ok(resources.water >= 0 && resources.water <= 100);
    }
  }
});
