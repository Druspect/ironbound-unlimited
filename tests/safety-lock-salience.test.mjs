import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../app/safety-lock-salience.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("safety lock polish is loaded after the general production layer", () => {
  const productionIndex = layout.indexOf('import "./production-polish.css"');
  const safetyIndex = layout.indexOf('import "./safety-lock-salience.css"');
  assert.ok(productionIndex >= 0 && safetyIndex > productionIndex,
    "safety-lock overrides must load after the generic production polish");
});

test("overheat state strengthens both cab telemetry and peripheral warning cues", () => {
  for (const selector of [
    ".experience.is-overloaded .cab",
    ".experience.is-overloaded .speed-card",
    ".experience.is-overloaded .speed-card .status-line",
    ".experience.is-overloaded .heat-monitor",
    ".experience.is-overloaded .vignette",
  ]) assert.ok(css.includes(selector), `missing ${selector}`);
});

test("safety salience remains geometry-neutral and respects reduced motion", () => {
  assert.doesNotMatch(css, /\.experience\.is-overloaded[^{]*\{[^}]*\b(?:left|right|top|bottom|width|height|transform)\s*:/s,
    "top-level safety treatment must not reposition the cab or scene");
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/);
});
