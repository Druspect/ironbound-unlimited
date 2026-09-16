import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/starter-consist-realism.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("starter tender correction restores body mass without changing axle geometry", () => {
  assert.match(layout, /import "\.\/starter-consist-realism\.css";/);
  assert.match(css, /\.engine-sprite-tom-thumb::before/);
  assert.match(css, /train-v2-tender\.webp/);
  assert.match(css, /width:\s*32%/);
  assert.match(css, /height:\s*47%/);
  assert.doesNotMatch(css, /\.engine-sprite-tom-thumb\s*\{[^}]*transform:/s);
  assert.doesNotMatch(css, /\.running-wheel|\.rail-near|--rail-contact-plane/);
});

test("starter has an explicit drawbar spanning both coupling zones", () => {
  assert.match(css, /\.engine-sprite-tom-thumb::after/);
  const left = Number(css.match(/\.engine-sprite-tom-thumb::after\s*\{[\s\S]*?left:\s*(-?[\d.]+)%/)?.[1]);
  const width = Number(css.match(/\.engine-sprite-tom-thumb::after\s*\{[\s\S]*?width:\s*([\d.]+)%/)?.[1]);
  assert.ok(left < 0, "drawbar must reach behind the tender toward the passenger consist");
  assert.ok(width >= 36, "drawbar must span the tender-to-locomotive connection zone");
});
