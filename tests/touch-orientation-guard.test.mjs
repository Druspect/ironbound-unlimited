import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const guardSource = await readFile(new URL("../app/touch-orientation-guard.tsx", import.meta.url), "utf8");
const guardCss = await readFile(new URL("../app/touch-orientation-guard.css", import.meta.url), "utf8");
const layoutSource = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("touch portrait guard is mounted globally after the production scene layers", () => {
  assert.match(layoutSource, /import TouchOrientationGuard from "\.\/touch-orientation-guard"/);
  assert.match(layoutSource, /import "\.\/touch-orientation-guard\.css"/);
  assert.match(layoutSource, /<TouchOrientationGuard \/>/);
});

test("orientation gate applies only to touch-capable portrait sessions", () => {
  assert.match(guardSource, /navigator\.maxTouchPoints > 0/);
  assert.match(guardSource, /\(any-pointer: coarse\)/);
  assert.match(guardSource, /\(orientation: portrait\)/);
  assert.match(guardSource, /data-orientation-guard="blocked"/);
  assert.match(guardSource, /Rotate to landscape/);
});

test("entering portrait pauses live gameplay before making the railway inert", () => {
  assert.match(guardSource, /!document\.querySelector\("\.game-shell"\)/,
    "only a live railway should be forced into the existing Options pause path");
  assert.match(guardSource, /button\.textContent\?\.trim\(\) === "OPTIONS"/);
  assert.match(guardSource, /optionsButton\?\.click\(\)/);
  assert.match(guardSource, /experience\?\.setAttribute\("inert", ""\)/);
  assert.match(guardSource, /experience\?\.removeAttribute\("inert"\)/);
});

test("portrait overlay owns the viewport and preserves reduced-motion preferences", () => {
  assert.match(guardCss, /\.touch-orientation-guard\s*\{[\s\S]*position:\s*fixed;[\s\S]*inset:\s*0;[\s\S]*z-index:\s*20000;/);
  assert.match(guardCss, /@media \(prefers-reduced-motion: no-preference\)/);
});
