import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const catalog = readFileSync(new URL("../app/locomotive-catalog.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/undercarriage-reconciliation.css", import.meta.url), "utf8");
const starterCss = readFileSync(new URL("../app/starter-consist-realism.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

const roster = [...catalog.matchAll(/\{ id: "([^"]+)", name:/g)].map((match) => match[1]);
const starter = "tom-thumb";
const articulated = ["nw-1218", "challenger-3985", "big-boy-4014"];
const rigid = ["southern-4501", "prr-1361", "nkp-765", "atsf-3751", "nw-611", "up-844", "polar-express-1225"];
const heritage = ["the-flyer-1907"];

test("every active locomotive belongs to exactly one undercarriage treatment", () => {
  assert.equal(roster.length, 12);
  assert.equal(new Set(roster).size, roster.length);
  const classified = new Set([starter, ...articulated, ...rigid, ...heritage]);
  assert.deepEqual([...classified].sort(), [...roster].sort());
  for (const id of [...articulated, ...rigid, ...heritage]) {
    assert.match(css, new RegExp(`engine-sprite-${id.replaceAll("-", "\\-")}`), `${id} must have an explicit family selector`);
  }
  assert.match(starterCss, /engine-sprite-tom-thumb/);
});

test("articulated engines retain two powered frame beds and a visible hinge", () => {
  for (const id of articulated) assert.match(css, new RegExp(`engine-sprite-${id.replaceAll("-", "\\-")}`));
  assert.match(css, /radial-gradient\(circle/);
  assert.match(css, /Never\s+bridge\s+them\s+with\s+one\s+rigid\s+slab/i);
});

test("reconciliation is visual backfill only and cannot move calibrated running gear", () => {
  assert.doesNotMatch(css, /translate(?:3d|X|Y)?\s*\(/i);
  assert.doesNotMatch(css, /--sprite-rail-inset\s*:/);
  assert.doesNotMatch(css, /--engine-left\s*:/);
  assert.doesNotMatch(css, /--engine-width\s*:/);
  assert.doesNotMatch(css, /\.engine-sprite-unit\s*\{[^}]*\b(?:left|right|bottom|width|transform)\s*:/s);
});

test("undercarriage reconciliation is loaded after headlight and track corrections", () => {
  const headlight = layout.indexOf('import "./headlight-realism.css"');
  const undercarriage = layout.indexOf('import "./undercarriage-reconciliation.css"');
  assert.ok(headlight >= 0 && undercarriage > headlight);
});
