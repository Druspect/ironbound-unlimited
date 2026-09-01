import assert from "node:assert/strict";
import test from "node:test";

import { advanceBrakePressure, advanceLocomotive } from "../app/locomotive-physics.ts";
import {
  DEFAULT_CONSIST,
  advanceSteamResources,
  calculateConsistMetrics,
  createSteamResourceState,
  operatingProfileFor,
  recordPassedStation,
  serviceSteamLocomotive,
} from "../app/steam-operations.ts";

test("a complete departure, cruise, brake, and station-service cycle preserves every subsystem contract", () => {
  const profile = operatingProfileFor("southern-4501");
  const metrics = calculateConsistMetrics(profile.id, DEFAULT_CONSIST);
  const options = {
    maximumSpeed: profile.maximumSpeedMph * metrics.maximumSpeedFactor,
    accelerationFactor: metrics.accelerationFactor,
    brakeResponseFactor: metrics.brakeResponseFactor,
    thermalLoadFactor: metrics.resourceLoadFactor / profile.thermalEfficiency,
  };
  let locomotive = { speed: 0, boilerLoad: 42, heat: 0, overloaded: false, safetyLockSeconds: 0, distance: 0 };
  let resources = createSteamResourceState();

  for (let step = 0; step < 1_200; step += 1) {
    locomotive = advanceLocomotive(locomotive, 48, .1, .3, 0, options);
    resources = advanceSteamResources(resources, profile, metrics, { throttle: 48, boilerLoad: locomotive.boilerLoad, heat: locomotive.heat, speed: locomotive.speed }, .1);
  }
  assert.ok(locomotive.speed > 20 && locomotive.speed <= options.maximumSpeed + .01);
  assert.ok(locomotive.distance > 0);
  assert.ok(resources.fuel < 100 && resources.water < 100);
  assert.equal(resources.failure, null);

  let pressure = 0;
  const brakeStartDistance = locomotive.distance;
  for (let step = 0; step < 1_200 && locomotive.speed >= 2.5; step += 1) {
    pressure = advanceBrakePressure(pressure, true, .1);
    locomotive = advanceLocomotive(locomotive, 0, .1, 0, pressure, options);
    resources = advanceSteamResources(resources, profile, metrics, { throttle: 0, boilerLoad: locomotive.boilerLoad, heat: locomotive.heat, speed: locomotive.speed }, .1);
  }
  assert.ok(locomotive.speed < 2.5, `stopped at ${locomotive.speed} MPH`);
  assert.ok(locomotive.distance > brakeStartDistance, "braking consumes real distance");
  assert.ok(locomotive.distance - brakeStartDistance < .75, "station approach remains controllable");

  resources = recordPassedStation(resources);
  assert.equal(resources.stationsWithoutService, 1);
  resources = serviceSteamLocomotive(resources);
  assert.deepEqual(resources, createSteamResourceState());
});
