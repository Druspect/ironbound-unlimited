import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/headlight-realism.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const catalog = await readFile(new URL("../app/locomotive-catalog.ts", import.meta.url), "utf8");

const locomotiveIds = [...catalog.matchAll(/\{ id: "([^"]+)"/g)].map((match) => match[1]);

test("headlight realism is loaded last among scene visual corrections", () => {
  const track = layout.indexOf('import "./track-ground-truth.css"');
  const lights = layout.indexOf('import "./headlight-realism.css"');
  assert.ok(track >= 0 && lights > track);
});

test("every fleet locomotive has an explicit headlight socket profile", () => {
  assert.equal(locomotiveIds.length, 12);
  for (const id of locomotiveIds) {
    assert.match(css, new RegExp(`\\.engine-sprite-${id.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*\\{`), `missing headlight profile for ${id}`);
  }
});

test("lamp source stays compact and projected light is explicitly conical", () => {
  assert.match(css, /--headlight-lens-size:\s*7px/);
  assert.match(css, /\.engine-sprite-frame::before[\s\S]*?border-radius:\s*50%/);
  assert.match(css, /\.engine-sprite-frame::after[\s\S]*?clip-path:\s*polygon\(0 46%, 100% 4%, 100% 96%, 0 54%\)/);
  assert.match(css, /mask-image:\s*linear-gradient\(90deg/);
  assert.doesNotMatch(css, /--headlight-lens-size:\s*(?:1[0-9]|[2-9][0-9])px/,
    "headlight source must not regress to an oversized glowing orb");
});

test("legacy starter bulb is disabled instead of double composited", () => {
  assert.match(css, /\.headlight-system\s*\{[\s\S]*?display:\s*none/);
});

test("headlight pass does not redefine wheel, rail, or locomotive placement geometry", () => {
  assert.doesNotMatch(css, /--rail-contact-plane|--engine-left|--engine-width|running-wheel|rail-near|rail-far/);
});

test("larger locomotives project farther without changing the starter calibration", () => {
  assert.match(css, /\.engine-sprite-tom-thumb\s*\{[\s\S]*?--headlight-x:\s*92\.8%[\s\S]*?--headlight-y:\s*26\.5%[\s\S]*?--headlight-beam-length:\s*340px/);
  assert.match(css, /\.engine-sprite-big-boy-4014\s*\{[\s\S]*?--headlight-beam-length:\s*520px/);
});
