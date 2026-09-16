import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/starter-consist-realism.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("starter tender correction restores body mass without changing axle geometry", () => {
  assert.match(layout, /import "\.\/starter-consist-realism\.css";/);
  assert.match(css, /\.engine-sprite-tom-thumb::before/);
  assert.match(css, /train-v2-tender\.webp/);
  assert.match(css, /left:\s*7%/);
  assert.match(css, /width:\s*32%/);
  assert.match(css, /height:\s*47%/);
  assert.doesNotMatch(css, /\.running-wheel|\.rail-near|--rail-contact-plane/);
});

test("starter closes the locomotive drawbar gap while tender world position stays fixed", () => {
  const parentShift = Number(css.match(/\.engine-sprite-tom-thumb\s*\{[\s\S]*?translate3d\((-?[\d.]+)%/)?.[1]);
  const tenderShift = Number(css.match(/\.engine-sprite-tom-thumb::after\s*\{[\s\S]*?translateX\(([\d.]+)%\)/)?.[1]);
  assert.equal(parentShift, -7);
  assert.equal(tenderShift, 7);
  assert.equal(parentShift + tenderShift, 0, "tender must retain its coach-relative world position");
  assert.match(css, /\.engine-sprite-tom-thumb \.engine-sprite-frame\s*\{[\s\S]*?clip-path:/);
  assert.match(css, /\.engine-sprite-tom-thumb::after\s*\{[\s\S]*?locomotive-shop\/v3\/sprites\/tom-thumb\.webp/);
  assert.match(css, /var\(--locomotive-lift, 0px\) \+ var\(--sprite-rail-inset\)/);
});
