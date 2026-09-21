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

test("wave three completes the twelve-engine proportion roster and removes fallback sizing", () => {
  const ids = [
    "tom-thumb", "southern-4501", "prr-1361", "nkp-765",
    "atsf-3751", "nw-611", "up-844", "nw-1218",
    "challenger-3985", "big-boy-4014", "the-flyer-1907", "polar-express-1225",
  ];
  for (const id of ids) assert.match(proportions, new RegExp(`"${id}"\\s*:\\s*\\{`));
  assert.equal((proportions.match(/engineAndTenderLengthFeet:/g) ?? []).length, 12);
  assert.doesNotMatch(proportions, /LEGACY_ENGINE_RENDER_BASE_WIDTH|legacyEngineRenderWidth/);
  assert.match(proportions, /if \(!profile\) throw new Error/);
});

test("running geometry and wheel phase consume the same fleet width contract", () => {
  assert.equal((page.match(/engineRenderWidth\(/g) ?? []).length, 2);
  assert.match(page, /engineRenderWidth\(activeEngine\.id\)/);
  assert.match(page, /engineRenderWidth\(activeEngineId\)/);
});

test("wave two documented lengths preserve real fleet ordering", () => {
  const expected = [
    ["nkp-765", "engineAndTenderLengthFeet: 100"],
    ["atsf-3751", "engineAndTenderLengthFeet: 108 + 7 / 12"],
    ["nw-611", "engineAndTenderLengthFeet: 110"],
    ["up-844", "engineAndTenderLengthFeet: 114 + 2.625 / 12"],
    ["nw-1218", "engineAndTenderLengthFeet: 121"],
    ["challenger-3985", "engineAndTenderLengthFeet: 121 + 10.875 / 12"],
    ["big-boy-4014", "engineAndTenderLengthFeet: 132 + 9.875 / 12"],
  ];
  for (const [id, lengthSource] of expected) {
    const blockStart = proportions.indexOf(`"${id}"`);
    assert.ok(blockStart >= 0, `${id} profile missing`);
    const blockEnd = proportions.indexOf("\n  },", blockStart);
    const block = proportions.slice(blockStart, blockEnd);
    assert.ok(block.includes(lengthSource), `${id} length source drifted`);
    assert.ok(block.includes('basis: "documented"'), `${id} must remain documented`);
    assert.ok(block.includes("sourceUrl:"), `${id} must retain provenance`);
  }
  assert.equal((proportions.match(/sourceUrl:/g) ?? []).length, 7);
});

test("wave three special cases are explicit about provenance", () => {
  const flyerStart = proportions.indexOf('"the-flyer-1907"');
  const flyerEnd = proportions.indexOf("\n  },", flyerStart);
  const flyer = proportions.slice(flyerStart, flyerEnd);
  assert.ok(flyer.includes("engineAndTenderLengthFeet: 78"));
  assert.ok(flyer.includes('basis: "visual-proxy"'));
  assert.doesNotMatch(flyer, /sourceUrl:/);

  const polarStart = proportions.indexOf('"polar-express-1225"');
  const polarEnd = proportions.indexOf("\n  },", polarStart);
  const polar = proportions.slice(polarStart, polarEnd);
  assert.ok(polar.includes("engineAndTenderLengthFeet: 101"));
  assert.ok(polar.includes('basis: "documented"'));
  assert.ok(polar.includes("https://michigansteamtrain.com/equipment/"));
});
