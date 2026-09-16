import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const css = fs.readFileSync(new URL("../app/biome-transition-continuity.css", import.meta.url), "utf8");
const layout = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("biome continuity layer is loaded after locomotive motion polish", () => {
  assert.ok(layout.includes('import "./biome-transition-continuity.css";'));
  assert.ok(layout.indexOf('import "./biome-transition-continuity.css";') > layout.indexOf('import "./animation-continuity.css";'));
});

test("route overlap grows without changing one-viewport tile progression", () => {
  assert.match(css, /--biome-overlap:\s*clamp\(600px,\s*52vw,\s*760px\)/);
  assert.match(css, /flex-basis:\s*calc\(100vw \+ var\(--biome-overlap\)\)/);
  assert.match(css, /margin-right:\s*calc\(-1 \* var\(--biome-overlap\)\)/);
});

test("neighboring scene art uses a broad bilateral feather instead of a hard swap", () => {
  assert.match(css, /--biome-feather:\s*clamp\(500px,\s*44vw,\s*640px\)/);
  assert.match(css, /mask-image:\s*linear-gradient\([\s\S]*transparent 0,[\s\S]*#000 var\(--biome-feather\)[\s\S]*transparent 100%/);
  assert.match(css, /\.route-tile\.first-tile[\s\S]*#000 0/);
});

test("transition correction cannot move track, train, station, or route distance mechanics", () => {
  assert.doesNotMatch(css, /\.track|\.rail|\.train-|\.station-|--route-x|translate3d|left\s*:|right\s*:/);
});

test("compact landscape retains a substantial but bounded blend envelope", () => {
  assert.match(css, /@media \(max-width:\s*980px\)/);
  assert.match(css, /--biome-overlap:\s*clamp\(420px,\s*58vw,\s*600px\)/);
  assert.match(css, /--biome-feather:\s*clamp\(350px,\s*48vw,\s*500px\)/);
});
