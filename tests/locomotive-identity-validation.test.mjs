import assert from "node:assert/strict";
import test from "node:test";

import { ENGINE_FACT_SHEETS } from "../app/engine-facts.ts";
import { LOCOMOTIVES } from "../app/locomotive-catalog.ts";
import {
  normalizedFleetSilhouettes,
  validateLocomotiveIdentity,
} from "../app/locomotive-identity-validation.ts";

test("catalog, fact sheets, registration, and axle geometry identify the same fleet", () => {
  const result = validateLocomotiveIdentity();
  assert.deepEqual(result.errors, [], result.errors.join("\n"));
  assert.deepEqual(
    Object.keys(result.silhouettes).sort(),
    LOCOMOTIVES.map((engine) => engine.id).sort(),
  );
  assert.deepEqual(
    Object.keys(result.silhouettes).sort(),
    Object.keys(ENGINE_FACT_SHEETS).sort(),
  );
});

test("every normalized silhouette has finite geometry and a stable fingerprint", () => {
  for (const silhouette of Object.values(normalizedFleetSilhouettes())) {
    for (const value of [
      silhouette.bodyWidthRatio,
      silhouette.bodyHeightRatio,
      silhouette.tenderWidthRatio,
      silhouette.tenderHeightRatio,
      silhouette.driverDiameterRatio,
      silhouette.stackXRatio,
      silhouette.stackYRatio,
    ]) assert.ok(Number.isFinite(value));
    assert.match(silhouette.fingerprint, /^\d+(?:-\d+){2,}\|/);
    assert.ok(silhouette.driverAxles >= 2);
    assert.ok(silhouette.tenderAxles >= 2);
  }
});

test("distinct classes are not exact normalized-silhouette clones", () => {
  const silhouettes = Object.values(normalizedFleetSilhouettes());
  const exactGroups = new Map();
  for (const silhouette of silhouettes) {
    const group = exactGroups.get(silhouette.fingerprint) ?? [];
    group.push(silhouette.engineId);
    exactGroups.set(silhouette.fingerprint, group);
  }
  const duplicates = [...exactGroups.values()].filter((group) => group.length > 1);
  assert.deepEqual(duplicates, []);
});
