import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const trackCss = await readFile(new URL("../app/track-realism.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

function cssNumber(name) {
  const match = trackCss.match(new RegExp(name + ":\\s*([0-9.]+)(?:px)?;"));
  assert.ok(match, "missing " + name);
  return Number(match[1]);
}

function rule(selector) {
  const escaped = selector.replace(/[.*+?^$()|[\\]\\]/g, "\\$&");
  return trackCss.match(new RegExp(escaped + "\\s*\\{([\\s\\S]*?)\\n\\}"))?.[1] ?? "";
}

test("one authoritative track stylesheet owns the physical section", () => {
  assert.match(layout, /import "\.\/track-realism\.css";/);
  assert.doesNotMatch(layout, /track-ground-truth/);
  assert.match(trackCss, /One authoritative stylesheet owns the complete rail section/);
});

test("timber and gauge proportions remain physically coherent", () => {
  const gauge = cssNumber("--track-standard-gauge-in");
  const tieLength = cssNumber("--track-tie-length-in");
  const tieWidth = cssNumber("--track-tie-width-in");
  const tieCenters = cssNumber("--track-tie-centers-in");
  const tiePitch = cssNumber("--track-tie-pitch");
  const tieFace = cssNumber("--track-tie-face");

  assert.equal(gauge, 56.5);
  assert.equal(tieLength, 102);
  assert.equal(tieWidth, 9);
  assert.equal(tieCenters, 19.5);
  assert.equal(tiePitch, 32);
  assert.equal(tieFace, 15);
  assert.ok(Math.abs(tieFace / tiePitch - tieWidth / tieCenters) <= .02);
});

test("track and wheels use one travel calibration and one timber period", () => {
  assert.equal(cssNumber("--track-motion-period"), 32);
  assert.match(page, /visualTravelRef\.current \* WHEEL_TRAVEL_CALIBRATION\) % 32/);
  assert.match(page, /const railTravel = visualTravelRef\.current \* WHEEL_TRAVEL_CALIBRATION/);
  const sleepers = rule(".sleepers");
  assert.match(sleepers, /background-position:\s*var\(--track-x, 0px\) 0/);
  assert.doesNotMatch(sleepers, /translate3d\(var\(--track-x/);
});

test("ballast and rails stay stable while timber alone communicates near-field travel", () => {
  assert.doesNotMatch(rule(".ballast"), /track-x|will-change/);
  assert.doesNotMatch(rule(".rail-near"), /track-x/);
  assert.doesNotMatch(rule(".rail-far"), /track-x/);
  assert.equal((trackCss.match(/var\(--track-x/g) ?? []).length, 1);
  assert.match(trackCss, /\.ballast::before,[\s\S]*\.ballast::after\s*\{[\s\S]*content:\s*none/);
});

test("rail profiles preserve the calibrated wheel contact plane", () => {
  assert.equal(cssNumber("--rail-near-profile"), 6);
  assert.equal(cssNumber("--rail-far-profile"), 3);
  assert.match(trackCss, /--rail-contact-plane:\s*calc\(var\(--train-base-lift\) \+ var\(--scaled-wheel-inset\)\)/);
  assert.match(trackCss, /\.rail-near\s*\{[\s\S]*?bottom:\s*calc\(var\(--rail-contact-plane\) - var\(--rail-near-profile\)\);[\s\S]*?height:\s*var\(--rail-near-profile\)/);
  assert.match(trackCss, /\.rail-far\s*\{[\s\S]*?rail-contact-plane\) \+ 13px/);
  assert.match(page, /maximumRailGap <= \.75/);
});

test("desktop band preserves the four-pixel train-platform relationship", () => {
  const desktop = trackCss.match(/@media \(min-height: 561px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const trainLift = Number(desktop.match(/--train-base-lift:\s*([0-9.]+)px/)?.[1]);
  const stationOffset = Number(desktop.match(/--hud-clearance\) \+ ([0-9.]+)px/)?.[1]);
  assert.equal(trainLift, 58);
  assert.equal(stationOffset, 54);
  assert.equal(trainLift - stationOffset, 4);
});

test("scene renders one physical track with exactly two steel rails", () => {
  const rails = page.match(/<div className="rail rail-(?:near|far)" \/>/g) ?? [];
  assert.equal(rails.length, 2);
  assert.match(page, /<div className="ballast" \/>[\s\S]*<div className="sleepers" \/>[\s\S]*rail-near[\s\S]*rail-far/);
  assert.match(trackCss, /\.track::before,[\s\S]*\.track::after\s*\{[\s\S]*content:\s*none/);
});
