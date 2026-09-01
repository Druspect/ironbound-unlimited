import assert from "node:assert/strict";
import test from "node:test";

import { LOCOMOTIVES } from "../app/locomotive-catalog.ts";
import {
  DEFAULT_CONSIST,
  LOCOMOTIVE_OPERATING_PROFILES,
  advanceSteamResources,
  calculateConsistMetrics,
  createSteamResourceState,
  operatingProfileFor,
  recordPassedStation,
  serviceSteamLocomotive,
  stationsUntilServiceRequired,
} from "../app/steam-operations.ts";

test("every locomotive has a distinct operating profile", () => {
  assert.deepEqual(
    LOCOMOTIVES.map((engine) => engine.id).sort(),
    Object.keys(LOCOMOTIVE_OPERATING_PROFILES).sort(),
  );
  for (const engine of LOCOMOTIVES) {
    const profile = operatingProfileFor(engine.id);
    assert.ok(profile.maximumSpeedMph > profile.cruiseSpeedMph);
    assert.ok(profile.maximumSpeedMph >= profile.economicalSpeedMaxMph);
    assert.ok(profile.economicalSpeedMaxMph > profile.economicalSpeedMinMph);
    assert.ok(profile.fuelCapacity > 0);
    assert.equal(profile.fuelCapacityUnit, profile.fuelType === "coal" ? "lb" : "gal");
    assert.ok(profile.waterCapacityGallons > 0);
  }
});

test("adding loaded cars increases mass, resource demand, and brake response", () => {
  const shortTrain = calculateConsistMetrics("tom-thumb", DEFAULT_CONSIST);
  const longTrain = calculateConsistMetrics("tom-thumb", [...DEFAULT_CONSIST, "dining-car", "pullman", "baggage-mail"]);
  assert.ok(longTrain.totalTrainTons > shortTrain.totalTrainTons);
  assert.ok(longTrain.accelerationFactor < shortTrain.accelerationFactor);
  assert.ok(longTrain.brakeResponseFactor > shortTrain.brakeResponseFactor);
  assert.ok(longTrain.resourceLoadFactor > shortTrain.resourceLoadFactor);
});

test("overheating accelerates water loss and high throttle burns more fuel", () => {
  const profile = operatingProfileFor("nkp-765");
  const metrics = calculateConsistMetrics("nkp-765", DEFAULT_CONSIST);
  const initial = createSteamResourceState();
  const economical = advanceSteamResources(initial, profile, metrics, { throttle: 48, boilerLoad: 58, heat: 20, speed: 50 }, .1);
  const overworked = advanceSteamResources(initial, profile, metrics, { throttle: 100, boilerLoad: 100, heat: 100, speed: 70 }, .1);
  assert.ok(overworked.fuel < economical.fuel);
  assert.ok(overworked.water < economical.water);
  assert.ok((100 - overworked.water) > (100 - economical.water) * 2);
});

test("tender capacity, fuel kind, and units drive resource range", () => {
  const coalProfile = operatingProfileFor("southern-4501");
  const oilProfile = operatingProfileFor("up-844");
  assert.equal(coalProfile.fuelType, "coal");
  assert.equal(coalProfile.fuelCapacityUnit, "lb");
  assert.equal(oilProfile.fuelType, "oil");
  assert.equal(oilProfile.fuelCapacityUnit, "gal");

  const metrics = calculateConsistMetrics(coalProfile.id, DEFAULT_CONSIST);
  const controls = { throttle: 62, boilerLoad: 70, heat: 30, speed: 45 };
  const normal = advanceSteamResources(createSteamResourceState(), coalProfile, metrics, controls, .1);
  const doubleCapacity = advanceSteamResources(createSteamResourceState(), { ...coalProfile, fuelCapacity: coalProfile.fuelCapacity * 2 }, metrics, controls, .1);
  assert.ok(Math.abs((100 - normal.fuel) / 2 - (100 - doubleCapacity.fuel)) < 1e-10);
});

test("a station service resets supplies and the four-station rule is enforced", () => {
  let state = { fuel: 42, water: 31, stationsWithoutService: 0, failure: null };
  for (let station = 0; station < 3; station += 1) state = recordPassedStation(state);
  assert.equal(stationsUntilServiceRequired(state), 1);
  assert.equal(state.failure, null);
  state = serviceSteamLocomotive(state);
  assert.deepEqual(state, createSteamResourceState());
  for (let station = 0; station < 4; station += 1) state = recordPassedStation(state);
  assert.equal(state.failure, "service");
  assert.equal(stationsUntilServiceRequired(state), 0);
});
