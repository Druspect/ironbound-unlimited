import assert from "node:assert/strict";
import test from "node:test";

import { ENGINE_FACT_SHEETS } from "../app/engine-facts.ts";
import { operatingProfileFor } from "../app/steam-operations.ts";

const closeTo = (actual, expected, tolerance = 0.5) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} must be within ${tolerance} of ${expected}`);
};

test("N&W 1218 source-backed weight and tender capacity drive its operating profile", () => {
  const facts = ENGINE_FACT_SHEETS["nw-1218"];
  const profile = operatingProfileFor("nw-1218");

  // Virginia DHR documentation lists 951,600 lb total, 35 tons coal and
  // 22,000 gallons of water. Game values round only the total mass to tons.
  closeTo(facts.engineAndTenderTons, 951_600 / 2_000, 0.25);
  assert.equal(facts.fuelCapacity, 70_000);
  assert.equal(facts.waterCapacityGallons, 22_000);
  assert.equal(profile.engineAndTenderTons, facts.engineAndTenderTons);
  assert.equal(profile.fuelCapacity, facts.fuelCapacity);
});

test("Santa Fe 3751 uses its rebuilt permitted rating rather than an exceptional recorded speed", () => {
  const facts = ENGINE_FACT_SHEETS["atsf-3751"];
  const profile = operatingProfileFor("atsf-3751");

  assert.equal(facts.service, "mixed");
  assert.equal(facts.maximumSpeedMph, 90);
  assert.equal(profile.maximumSpeedMph, 90);
  assert.match(facts.summary, /passenger-and-freight/i);
});

test("N&W 611 and NKP 765 retain source-backed production values", () => {
  assert.equal(ENGINE_FACT_SHEETS["nw-611"].maximumSpeedMph, 100);
  assert.equal(ENGINE_FACT_SHEETS["nkp-765"].engineAndTenderTons, 404);
});

test("documented corrections remain physically downstream, not display-only", () => {
  for (const engineId of ["atsf-3751", "nw-611", "nw-1218", "nkp-765"]) {
    const facts = ENGINE_FACT_SHEETS[engineId];
    const profile = operatingProfileFor(engineId);
    assert.equal(profile.maximumSpeedMph, facts.maximumSpeedMph);
    assert.equal(profile.engineAndTenderTons, facts.engineAndTenderTons);
    assert.equal(profile.fuelCapacity, facts.fuelCapacity);
    assert.equal(profile.waterCapacityGallons, facts.waterCapacityGallons);
  }
});
