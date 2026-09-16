import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/track-ground-truth.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

function number(name) {
  const match = css.match(new RegExp(`${name}:\\s*([0-9.]+)px;`));
  assert.ok(match, `missing ${name}`);
  return Number(match[1]);
}

test("ground-truth track layer is applied after all earlier scene geometry", () => {
  const base = layout.indexOf('import "./track-realism.css"');
  const starter = layout.indexOf('import "./starter-consist-realism.css"');
  const groundTruth = layout.indexOf('import "./track-ground-truth.css"');
  assert.ok(base >= 0 && base < starter && starter < groundTruth);
});

test("rail sections are slimmer without moving the calibrated contact plane", () => {
  assert.equal(number("--rail-near-profile"), 6);
  assert.equal(number("--rail-far-profile"), 3);
  assert.match(css, /\.rail-far\s*\{[\s\S]*?rail-contact-plane\) \+ 13px/);
  assert.doesNotMatch(css, /--rail-contact-plane\s*:/,
    "ground-truth layer must inherit, not redefine, the calibrated wheel contact plane");
});

test("ballast is a lower shoulder rather than an opaque fascia", () => {
  const ballast = css.match(/\.ballast\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(ballast, /height:\s*30px/);
  assert.match(ballast, /transparent 100%/);
  assert.match(ballast, /mask-image:\s*linear-gradient/);
  assert.ok(number("--rail-near-profile") < 9);
});

test("extra full-width tie-seat bar is removed while timber rhythm remains inherited", () => {
  assert.match(css, /\.track::after\s*\{[\s\S]*?content:\s*none/);
  assert.match(css, /\.sleepers\s*\{[\s\S]*?rotateX\(30deg\)/);
  assert.doesNotMatch(css, /--track-tie-pitch\s*:/,
    "physical tie spacing stays owned by the reference track layer");
  assert.doesNotMatch(css, /--track-tie-face\s*:/,
    "physical tie face ratio stays owned by the reference track layer");
});
