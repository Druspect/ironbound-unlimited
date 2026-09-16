import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/production-polish.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("production polish is the final presentation layer", () => {
  const polish = layout.indexOf('import "./production-polish.css"');
  const carriage = layout.indexOf('import "./carriage-liveries.css"');
  const undercarriage = layout.indexOf('import "./undercarriage-reconciliation.css"');
  assert.ok(polish > carriage && polish > undercarriage);
});

test("running consist no longer carries floating arcade car labels", () => {
  assert.match(css, /\.scene\s+\.car-mark\s*\{[\s\S]*?display:\s*none/);
});

test("duplicate terrain HUD is removed while camera controls remain readable", () => {
  assert.match(css, /\.right-hud\s+\.biome-card\s*\{[\s\S]*?display:\s*none/);
  assert.match(css, /\.zoom-card\s*>\s*div\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,/);
  assert.match(css, /\.zoom-card\s+button\s*\{[\s\S]*?min-height:\s*42px/);
  assert.match(css, /\.zoom-card\s+button\s+small\s*\{[\s\S]*?font-size:\s*9\.5px/);
});

test("low steam is event-driven instead of permanently venting", () => {
  assert.match(css, /\.engine-sprite-tom-thumb\s+\.steam-vent\s*\{[\s\S]*?opacity:\s*0[\s\S]*?animation:\s*none/);
  assert.match(css, /\.train-wrap\.is-servicing\s+\.engine-sprite-tom-thumb\s+\.steam-vent/);
  assert.match(css, /\.train-wrap\.is-servicing\s+\.engine-sprite-unit:not\(\.engine-sprite-tom-thumb\)::after/);
  assert.match(css, /\.experience\.is-overloaded\s+\.engine-sprite-unit:not\(\.engine-sprite-tom-thumb\)::after/);
});

test("production polish cannot move calibrated train or track geometry", () => {
  assert.doesNotMatch(css, /--rail-contact-plane|--engine-left|--engine-width|--car-width|\.running-wheel|\.rail-near|\.rail-far|\.track\s*\{/);
  assert.doesNotMatch(css, /\.engine-sprite-frame\s*\{[\s\S]*?(?:left|right|top|bottom|transform)\s*:/);
});

test("daylight headlight treatment remains restrained and reduced motion remains supported", () => {
  assert.match(css, /\.phase-golden\s+\.engine-sprite-unit\s*\{[\s\S]*?--headlight-phase:\s*\.24/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /animation:\s*none\s*!important/);
});
