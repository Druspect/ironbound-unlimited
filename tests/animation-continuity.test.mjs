import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const css = fs.readFileSync(new URL("../app/animation-continuity.css", import.meta.url), "utf8");
const layout = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("animation continuity is loaded after the existing production polish layer", () => {
  assert.ok(layout.includes('import "./animation-continuity.css";'));
  assert.ok(layout.indexOf('import "./animation-continuity.css";') > layout.indexOf('import "./production-polish.css";'));
});

test("continuous locomotive motion is phase-locked to the existing driver angle", () => {
  assert.match(css, /sin\(var\(--driver-wheel-angle/);
  assert.match(css, /cos\(var\(--driver-wheel-angle/);
  assert.match(css, /--phase-surge-amplitude:\s*\.28px/);
  assert.match(css, /--phase-rise-amplitude:\s*\.16px/);
});

test("articulated engines are damped rather than animated like light locomotives", () => {
  for (const id of ["nw-1218", "challenger-3985", "big-boy-4014"]) assert.ok(css.includes(`.engine-sprite-${id}`));
  assert.match(css, /--phase-surge-amplitude:\s*\.18px/);
  assert.match(css, /--phase-rise-amplitude:\s*\.10px/);
});

test("continuity pass is geometry-neutral and respects reduced motion", () => {
  assert.doesNotMatch(css, /rail-near|rail-far|running-wheel|small-wheel|wheel-position|sprite-rail-inset|bottom\s*:/);
  assert.match(css, /\.reduced-motion \.engine-sprite-frame[\s\S]*transform:\s*none !important/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
