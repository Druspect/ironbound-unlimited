import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/starter-consist-realism.css", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
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

test("starter closes the drawbar gap while both tender poses retain world position", () => {
  const parentShift = Number(css.match(/\.engine-sprite-tom-thumb\s*\{[\s\S]*?translate3d\((-?[\d.]+)%/)?.[1]);
  const tenderShift = Number(css.match(/\.starter-tender-frame\s*\{[\s\S]*?translateX\(([\d.]+)%\)/)?.[1]);
  assert.equal(parentShift, -7);
  assert.equal(tenderShift, 7);
  assert.equal(parentShift + tenderShift, 0);
  assert.match(css, /\.engine-sprite-tom-thumb \.engine-sprite-frame\s*\{[\s\S]*?clip-path:/);
  assert.match(css, /\.starter-tender-frame-primary[\s\S]*--engine-sprite-a-x/);
  assert.match(css, /\.starter-tender-frame-secondary[\s\S]*--engine-sprite-b-x/);
  assert.match(page, /starter-tender-frame starter-tender-frame-primary/);
  assert.match(page, /starter-tender-frame starter-tender-frame-secondary/);
  assert.doesNotMatch(css, /\.engine-sprite-tom-thumb::after/);
});
