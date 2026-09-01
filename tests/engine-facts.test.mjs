import assert from "node:assert/strict";
import test from "node:test";

import registration from "../app/locomotive-registration.json" with { type: "json" };
import { ENGINE_FACT_SHEETS, engineFactSheetFor, wheelAxleCounts } from "../app/engine-facts.ts";
import { LOCOMOTIVES } from "../app/locomotive-catalog.ts";
import { operatingProfileFor } from "../app/steam-operations.ts";

test("every store engine has one sourced fact sheet and no orphan facts", () => {
  assert.deepEqual(Object.keys(ENGINE_FACT_SHEETS).sort(), LOCOMOTIVES.map(({ id }) => id).sort());
  for (const engine of LOCOMOTIVES) {
    const fact = engineFactSheetFor(engine.id);
    assert.equal(fact.id, engine.id);
    assert.equal(fact.wheelArrangement, engine.wheelArrangement);
    assert.match(fact.sourceUrl, /^https:\/\//);
    assert.ok(fact.builder.length >= 4);
    assert.ok(fact.builtYear >= 1900 && fact.builtYear <= 1950);
    assert.ok(fact.summary.length >= 60);
    assert.ok(fact.tractiveEffortLbf >= 20_000);
    assert.ok(fact.driverDiameterInches >= 60 && fact.driverDiameterInches <= 80);
  }
});

test("fictional roster identities are labelled as proxies, never historical facts", () => {
  const proxies = Object.values(ENGINE_FACT_SHEETS).filter(({ accuracy }) => accuracy === "fictional-proxy");
  assert.deepEqual(proxies.map(({ id }) => id).sort(), ["the-flyer-1907", "tom-thumb"]);
  assert.equal(engineFactSheetFor("polar-express-1225").accuracy, "documented-inspiration");
  assert.match(engineFactSheetFor("polar-express-1225").summary, /real Pere Marquette 1225/i);
});

test("operating limits, modeled weights, and water capacities reconcile to the fact sheets", () => {
  for (const engine of LOCOMOTIVES) {
    const fact = engineFactSheetFor(engine.id);
    const profile = operatingProfileFor(engine.id);
    assert.equal(profile.maximumSpeedMph, fact.maximumSpeedMph, `${engine.id} speed`);
    assert.equal(profile.engineAndTenderTons, fact.engineAndTenderTons, `${engine.id} weight`);
    assert.equal(profile.waterCapacityGallons, fact.waterCapacityGallons, `${engine.id} water`);
    assert.equal(profile.fuelType, fact.fuelType, `${engine.id} fuel type`);
    assert.equal(profile.fuelCapacity, fact.fuelCapacity, `${engine.id} fuel capacity`);
    assert.equal(profile.fuelCapacityUnit, fact.fuelCapacityUnit, `${engine.id} fuel unit`);
    assert.equal(profile.service, fact.service, `${engine.id} service`);
  }
});

test("Whyte notation and registered undercarriages agree axle-for-axle", () => {
  for (const engine of LOCOMOTIVES) {
    const expected = wheelAxleCounts(engine.wheelArrangement);
    const axles = registration.profiles[engine.id].axles;
    assert.equal(axles.filter(({ kind }) => kind === "leading").length, expected.leading, `${engine.id} leading`);
    assert.equal(axles.filter(({ kind }) => kind === "driver").length, expected.drivers, `${engine.id} drivers`);
    assert.equal(axles.filter(({ kind }) => kind === "trailing").length, expected.trailing, `${engine.id} trailing`);
    assert.ok(axles.filter(({ kind }) => kind === "tender").length >= 2, `${engine.id} tender support`);
  }
});

test("malformed wheel arrangements fail loudly", () => {
  for (const invalid of ["4-6", "4-7-2", "four-six-zero", "4--0"]) {
    assert.throws(() => wheelAxleCounts(invalid), /Invalid Whyte arrangement/);
  }
});
