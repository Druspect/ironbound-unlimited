import assert from "node:assert/strict";
import test from "node:test";
import { LOCOMOTIVES, STARTER_LOCOMOTIVE_ID } from "../app/locomotive-catalog.ts";
import { ACTIVE_LOCOMOTIVES, FLEET_REVIEW_UNLOCKED, canEquipLocomotive, resolveEquippedLocomotive, selectLocomotive } from "../app/fleet-access.ts";

test("the complete twelve-engine fleet is present while public progression stays earned", () => {
  assert.equal(LOCOMOTIVES.length, 12);
  assert.deepEqual(ACTIVE_LOCOMOTIVES.map((engine) => engine.id), LOCOMOTIVES.map((engine) => engine.id));
  assert.deepEqual(LOCOMOTIVES.slice(-2).map((engine) => engine.id), ["the-flyer-1907", "polar-express-1225"]);
  assert.equal(FLEET_REVIEW_UNLOCKED, false);
  const save = { bonds: 1234, ownedEngines: [STARTER_LOCOMOTIVE_ID], equippedEngine: STARTER_LOCOMOTIVE_ID };
  for (const engine of ACTIVE_LOCOMOTIVES) {
    assert.equal(canEquipLocomotive(engine.id, save.ownedEngines, true), true);
    const selected = selectLocomotive(save, engine.id, true);
    assert.equal(selected.equippedEngine, engine.id);
    assert.equal(selected.bonds, save.bonds);
    assert.deepEqual(selected.ownedEngines, save.ownedEngines);
    assert.equal(resolveEquippedLocomotive(engine.id, save.ownedEngines, true), engine.id);
  }
});

test("full-fleet review leaves no catalog model shelved", () => {
  const ownedEngines = LOCOMOTIVES.map((engine) => engine.id);
  assert.equal(LOCOMOTIVES.filter((item) => !ACTIVE_LOCOMOTIVES.includes(item)).length, 0);
  assert.ok(LOCOMOTIVES.every((engine) => canEquipLocomotive(engine.id, ownedEngines)));
});

test("normal progression rejects unaffordable engines and charges exactly once", () => {
  const save = { bonds: 2500, ownedEngines: [STARTER_LOCOMOTIVE_ID], equippedEngine: "big-boy-4014" };
  assert.equal(canEquipLocomotive("big-boy-4014", save.ownedEngines, false), false);
  assert.equal(resolveEquippedLocomotive(save.equippedEngine, save.ownedEngines, false), STARTER_LOCOMOTIVE_ID);
  assert.equal(selectLocomotive(save, "big-boy-4014", false), save);
  const purchase = selectLocomotive(save, "southern-4501", false);
  assert.equal(purchase.bonds, 600);
  assert.deepEqual(purchase.ownedEngines, [STARTER_LOCOMOTIVE_ID, "southern-4501"]);
  assert.equal(selectLocomotive(purchase, "southern-4501", false).bonds, 600);
});

test("removed Jupiter cannot be restored by old saves or review unlock", () => {
  assert.equal(LOCOMOTIVES.some((engine) => engine.id === "jupiter"), false);
  const save = { bonds: 5000, ownedEngines: [STARTER_LOCOMOTIVE_ID, "jupiter"], equippedEngine: "jupiter" };
  assert.equal(resolveEquippedLocomotive("jupiter", save.ownedEngines), STARTER_LOCOMOTIVE_ID);
  assert.equal(canEquipLocomotive("jupiter", save.ownedEngines), false);
  assert.equal(selectLocomotive(save, "jupiter"), save);
});

test("unknown engine IDs never get equipped", () => {
  const save = { bonds: 1000, ownedEngines: [STARTER_LOCOMOTIVE_ID], equippedEngine: STARTER_LOCOMOTIVE_ID };
  assert.equal(selectLocomotive(save, "missing"), save);
  assert.equal(canEquipLocomotive("missing", save.ownedEngines), false);
  assert.equal(resolveEquippedLocomotive("missing", save.ownedEngines), STARTER_LOCOMOTIVE_ID);
});
