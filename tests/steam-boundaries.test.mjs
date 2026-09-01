import assert from "node:assert/strict";
import test from "node:test";

import { LOCOMOTIVES } from "../app/locomotive-catalog.ts";
import { advanceLocomotive, targetSpeedForThrottle } from "../app/locomotive-physics.ts";
import {
  DEFAULT_CONSIST,
  advanceSteamResources,
  calculateConsistMetrics,
  calculateServiceDurationSeconds,
  createSteamResourceState,
  latestMissedStationSequence,
  operatingProfileFor,
  recordPassedStation,
  serviceSteamLocomotive,
  stationServiceProgress,
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

test("fact-derived handling signatures are bounded and unique across the full fleet", () => {
  const signatures = new Set();
  for (const engine of LOCOMOTIVES) {
    const profile = operatingProfileFor(engine.id);
    assert.ok(profile.throttleResponseFactor >= .72 && profile.throttleResponseFactor <= 1.24, `${engine.id} response`);
    assert.ok(profile.adhesionFactor >= .84 && profile.adhesionFactor <= 1.12, `${engine.id} adhesion`);
    assert.ok(profile.steamingCapacityFactor >= .86 && profile.steamingCapacityFactor <= 1.18, `${engine.id} steam`);
    assert.ok(profile.brakeRiggingFactor >= .76 && profile.brakeRiggingFactor <= 1.16, `${engine.id} brakes`);
    signatures.add([profile.throttleResponseFactor, profile.adhesionFactor, profile.steamingCapacityFactor, profile.brakeRiggingFactor].map((value) => value.toFixed(4)).join("/"));
  }
  assert.equal(signatures.size, LOCOMOTIVES.length, "no two engines may collapse to one handling signature");
});

test("adhesion, throttle response, steaming capacity, and brake rigging each change behavior", () => {
  const prr = operatingProfileFor("prr-1361");
  const bigBoy = operatingProfileFor("big-boy-4014");
  const up844 = operatingProfileFor("up-844");
  const southern = operatingProfileFor("southern-4501");
  const state = { speed: 0, boilerLoad: 42, heat: 0, overloaded: false, safetyLockSeconds: 0, distance: 0 };

  const accelerate = (profile) => {
    let current = state;
    for (let step = 0; step < 80; step += 1) current = advanceLocomotive(current, 62, .1, 1.1, 0, { maximumSpeed: 70, throttleResponseFactor: profile.throttleResponseFactor });
    return current.speed;
  };
  assert.ok(accelerate(prr) > accelerate(bigBoy) + 2, "a high-driver Pacific must answer the regulator faster than an articulated freight engine");

  const gradeTarget = (profile) => targetSpeedForThrottle(60, false, 2.2, { maximumSpeed: 70, adhesionFactor: profile.adhesionFactor });
  assert.ok(gradeTarget(bigBoy) > gradeTarget(up844), "higher adhesion must preserve more speed on grade");

  const steam = (profile) => {
    let current = state;
    for (let step = 0; step < 100; step += 1) current = advanceLocomotive(current, 78, .1, 0, 0, { maximumSpeed: 70, steamingCapacityFactor: profile.steamingCapacityFactor });
    return current.boilerLoad;
  };
  assert.ok(steam(up844) < steam(southern), "greater steaming capacity must carry equal demand at lower boiler load");

  const brake = (profile) => {
    let current = { ...state, speed: 45 };
    for (let step = 0; step < 20; step += 1) current = advanceLocomotive(current, 0, .1, 0, 1, { maximumSpeed: 70, brakeRiggingFactor: profile.brakeRiggingFactor });
    return current.speed;
  };
  assert.ok(brake(prr) < brake(bigBoy), "stronger brake rigging must reduce speed sooner under equal application");
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

test("service time has hard bounds and grows with physical capacity, depletion, and consist length", () => {
  const starter = operatingProfileFor("tom-thumb");
  const bigBoy = operatingProfileFor("big-boy-4014");
  const short = calculateConsistMetrics("tom-thumb", DEFAULT_CONSIST);
  const long = calculateConsistMetrics("tom-thumb", LONG_CONSIST);
  const bigBoyShort = calculateConsistMetrics("big-boy-4014", DEFAULT_CONSIST);
  const ready = createSteamResourceState();
  const depleted = { fuel: 18, water: 9, stationsWithoutService: 3, failure: null };
  assert.equal(calculateServiceDurationSeconds(ready, short, starter), 2.4);
  assert.ok(calculateServiceDurationSeconds(depleted, short, starter) > calculateServiceDurationSeconds(ready, short, starter));
  assert.ok(calculateServiceDurationSeconds(depleted, long, starter) > calculateServiceDurationSeconds(depleted, short, starter));
  assert.ok(calculateServiceDurationSeconds({ ...depleted, stationsWithoutService: 0 }, bigBoyShort, bigBoy) > calculateServiceDurationSeconds({ ...depleted, stationsWithoutService: 0 }, short, starter));
  assert.ok(calculateServiceDurationSeconds(depleted, long, starter) <= 12);
});

test("station service is progressive and an early departure keeps the partial refill", () => {
  const arrival = { fuel: 20, water: 35, stationsWithoutService: 3, failure: null };
  const quarter = stationServiceProgress(arrival, .25);
  const half = stationServiceProgress(arrival, .5);
  assert.deepEqual(quarter, { fuel: 40, water: 51.25, stationsWithoutService: 3, failure: null });
  assert.ok(half.fuel > quarter.fuel && half.water > quarter.water);
  assert.equal(half.stationsWithoutService, 3, "partial service does not erase the mandatory-stop counter");
  assert.deepEqual(serviceSteamLocomotive(stationServiceProgress(arrival, 1)), createSteamResourceState());
});

test("the fourth station remains serviceable until the train leaves its platform grace boundary", () => {
  const first = 230;
  const interval = 1_400;
  const grace = 131;
  let resources = createSteamResourceState();
  for (let station = 0; station < 3; station += 1) {
    const sequenceAtCenter = latestMissedStationSequence(first + station * interval, first, interval, grace);
    assert.equal(sequenceAtCenter, station - 1);
    resources = recordPassedStation(resources);
  }
  const fourthCenter = first + 3 * interval;
  assert.equal(latestMissedStationSequence(fourthCenter, first, interval, grace), 2);
  assert.equal(resources.failure, null, "arriving at the fourth platform must not end the run");
  assert.deepEqual(serviceSteamLocomotive(resources), createSteamResourceState());

  const outsideFourthPlatform = fourthCenter + grace;
  assert.equal(latestMissedStationSequence(outsideFourthPlatform, first, interval, grace), 3);
  assert.equal(recordPassedStation(resources).failure, "service", "passing beyond the fourth platform still ends the run");
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
        throttleResponseFactor: profile.throttleResponseFactor,
        adhesionFactor: profile.adhesionFactor,
        steamingCapacityFactor: profile.steamingCapacityFactor,
        brakeRiggingFactor: profile.brakeRiggingFactor,
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
