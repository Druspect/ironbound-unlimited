import assert from "node:assert/strict";
import test from "node:test";

import { ENGINE_FACT_SHEETS } from "../app/engine-facts.ts";
import {
  CARRIAGE_FAMILIES,
  CARRIAGE_ROAD_GROUPS,
  carriageFamilyForEngine,
  compatibleCarIdsForEngine,
  isCarCompatibleWithEngine,
  normalizeConsistForEngine,
  validateCarriageFamilyCoverage,
} from "../app/carriage-compatibility.ts";

const ALL_CAR_IDS = ["day-coach", "pullman", "baggage-mail", "dining-car", "observation-car"].sort();

test("every locomotive belongs to exactly one era family and railroad group", () => {
  assert.deepEqual(validateCarriageFamilyCoverage(), { missing: [], unknown: [], duplicates: [] });
  for (const engineId of Object.keys(ENGINE_FACT_SHEETS)) {
    const family = carriageFamilyForEngine(engineId);
    assert.deepEqual([...family.allowedCarIds].sort(), ALL_CAR_IDS);
    assert.ok(family.preferredOrder.every((carId) => family.allowedCarIds.includes(carId)));
    assert.ok(family.roadLabel.length > 0);
    assert.ok(family.liveryKey.length > 0);
    assert.match(family.label, /•/);
  }
});

test("all five generic heavyweight passenger roles remain valid across the current roster", () => {
  for (const engineId of Object.keys(ENGINE_FACT_SHEETS)) {
    for (const carId of ALL_CAR_IDS) assert.equal(isCarCompatibleWithEngine(engineId, carId), true);
  }
});

test("save migration keeps train length and replaces unknown future or damaged car ids", () => {
  const source = ["observation-car", "pullman", "unknown-car", "baggage-mail", "day-coach"];
  const normalized = normalizeConsistForEngine("tom-thumb", source);
  assert.equal(normalized.length, source.length);
  assert.ok(normalized.every((carId) => compatibleCarIdsForEngine("tom-thumb").includes(carId)));
  assert.notEqual(normalized[2], "unknown-car");
});

test("families constrain era context while road groups avoid false livery ownership claims", () => {
  for (const family of CARRIAGE_FAMILIES) {
    assert.match(family.eraLabel, /steam-era|passenger/i);
    assert.match(family.compatibilityNote, /passenger|consist|family|stock|identity/i);
  }
  for (const group of CARRIAGE_ROAD_GROUPS) {
    assert.ok(group.liveryKey.length > 0);
    assert.match(group.note, /identity|generic|shared|inspired/i);
  }
});

test("major historical roads remain distinct compatibility identities", () => {
  assert.equal(carriageFamilyForEngine("southern-4501").roadGroupId, "southern");
  assert.equal(carriageFamilyForEngine("prr-1361").roadGroupId, "pennsylvania");
  assert.equal(carriageFamilyForEngine("atsf-3751").roadGroupId, "santa-fe");
  assert.equal(carriageFamilyForEngine("nw-611").roadGroupId, "norfolk-western");
  assert.equal(carriageFamilyForEngine("big-boy-4014").roadGroupId, "union-pacific");
});
