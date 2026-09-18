import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const proportions = await readFile(new URL("../app/fleet-proportions.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("wave one establishes one heavyweight coach yardstick", () => {
  assert.match(proportions, /CANONICAL_COACH_LENGTH_FEET = 80/);
  assert.match(proportions, /CANONICAL_COACH_WHEEL_DIAMETER_INCHES = 36/);
  assert.match(proportions, /CANONICAL_COACH_RENDER_WIDTH = 190/);
  assert.match(page, /COACH_WHEEL_POSITIONS = \[8, 18, 78, 88\]/);
});

test("wave one migrates only starter, Southern 4501, and PRR 1361", () => {
  for (const id of ["tom-thumb", "southern-4501", "prr-1361"]) {
    assert.match(proportions, new RegExp(`"${id}"\\s*:\\s*\\{`));
  }
  for (const id of ["nkp-765", "atsf-3751", "nw-611", "up-844", "nw-1218", "challenger-3985", "big-boy-4014", "the-flyer-1907", "polar-express-1225"]) {
    assert.doesNotMatch(proportions, new RegExp(`"${id}"\\s*:\\s*\\{`));
  }
  assert.match(proportions, /if \(!profile\) return legacyEngineRenderWidth/);
});

test("running geometry and wheel phase consume the same fleet width contract", () => {
  assert.equal((page.match(/engineRenderWidth\(/g) ?? []).length, 2);
  assert.match(page, /engineRenderWidth\(activeEngine\.id, activeRuntimeLayout\?\.totalWidth\)/);
  assert.match(page, /engineRenderWidth\(activeEngineId, activeLayout\?\.totalWidth\)/);
});
