import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/station-foreground.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("stage B renders one synchronized foreground composition for every station", () => {
  assert.match(page, /className="station-foreground-layer"/);
  assert.match(page, /data-station-foreground-index=\{index\}/);
  assert.equal((page.match(/station-foreground-passengers/g) ?? []).length, 2);
  assert.match(page, /station-near-platform/);
  assert.match(page, /station-near-canopy-left/);
  assert.match(page, /station-near-canopy-right/);
  assert.match(page, /station-near-railing-left/);
  assert.match(page, /station-near-railing-right/);
});

test("foreground reuses the original station-specific human service art", () => {
  assert.match(page, /\/assets\/stations\/service\/v1\/\$\{station\.serviceArt\}\.webp/);
  assert.doesNotMatch(page, /generic-passenger|crowd\.webp|human\.webp/);
  assert.match(css, /station-foreground-passengers-a/);
  assert.match(css, /station-foreground-passengers-b/);
});

test("near platform stays above ballast but protects wheel visibility", () => {
  assert.match(css, /bottom: -28px;[\s\S]*height: 38px;/);
  assert.match(css, /central[\s\S]*wheel\/coupler silhouette stays readable/);
  assert.match(css, /\.station-foreground-layer[\s\S]*z-index: 8/);
});

test("station foreground stylesheet loads after track geometry", () => {
  const track = layout.indexOf('import "./track-realism.css"');
  const foreground = layout.indexOf('import "./station-foreground.css"');
  assert.ok(track >= 0 && foreground > track);
});
