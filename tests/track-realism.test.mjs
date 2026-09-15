import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const trackCss = await readFile(new URL("../app/track-realism.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

function cssNumber(name) {
  const match = trackCss.match(new RegExp(`${name}:\\s*([0-9.]+)(?:px)?;`));
  assert.ok(match, `missing ${name}`);
  return Number(match[1]);
}

function rule(selector) {
  return trackCss.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";
}

test("track realism layer is the final scene-style override", () => {
  const globals = layout.indexOf('import "./globals.css"');
  const compact = layout.indexOf('import "./compact-landscape.css"');
  const accessibility = layout.indexOf('import "./input-accessibility.css"');
  const track = layout.indexOf('import "./track-realism.css"');
  assert.ok(globals >= 0 && globals < compact && compact < accessibility && accessibility < track);
  assert.doesNotMatch(trackCss, /inset-bottom/);
});

test("timber tie proportions stay close to conventional North American track", () => {
  const gauge = cssNumber("--track-standard-gauge-in");
  const tieLength = cssNumber("--track-tie-length-in");
  const tieWidth = cssNumber("--track-tie-width-in");
  const tieThickness = cssNumber("--track-tie-thickness-in");
  const tieCenters = cssNumber("--track-tie-centers-in");
  const tiePitch = cssNumber("--track-tie-pitch");
  const tieFace = cssNumber("--track-tie-face");

  assert.equal(gauge, 56.5);
  assert.equal(tieLength, 102);
  assert.equal(tieWidth, 9);
  assert.equal(tieThickness, 7);
  assert.equal(tieCenters, 19.5);

  const physicalCoverage = tieWidth / tieCenters;
  const renderedCoverage = tieFace / tiePitch;
  assert.ok(Math.abs(renderedCoverage - physicalCoverage) <= 0.02,
    `rendered tie coverage ${renderedCoverage} diverges from physical ${physicalCoverage}`);
  assert.ok(gauge / tieLength > .54 && gauge / tieLength < .56,
    "standard gauge must remain coherent with the declared tie length");
});

test("desktop composition exposes track without changing train-platform relationship", () => {
  const desktop = trackCss.match(/@media \(min-height: 561px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const trainLift = Number(desktop.match(/--train-base-lift:\s*([0-9.]+)px/)?.[1]);
  const stationOffset = Number(desktop.match(/--hud-clearance\) \+ ([0-9.]+)px/)?.[1]);
  assert.equal(trainLift, 58);
  assert.equal(stationOffset, 54);
  assert.equal(trainLift - stationOffset, 4,
    "desktop visual lift must preserve the established four-pixel train/platform relationship");
});

test("tie texture loops seamlessly with rail travel", () => {
  const tiePitch = cssNumber("--track-tie-pitch");
  const motionPeriod = cssNumber("--track-motion-period");
  assert.equal(motionPeriod % tiePitch, 0);
  assert.match(page, /--track-x", `\$\{-\(\(visualTravelRef\.current \* 7\.2\) % 160\)\}px`/);
});

test("ties and ballast share the same rail-travel phase", () => {
  assert.match(rule(".sleepers"), /translate3d\(var\(--track-x\), 0, 0\)/);
  assert.match(rule(".ballast"), /background-position:\s*var\(--track-x\) 0/);
  assert.match(rule(".ballast::before"), /background-position:\s*var\(--track-x\) 0/);
  assert.doesNotMatch(rule(".rail-near"), /track-x/);
  assert.doesNotMatch(rule(".rail-far"), /track-x/);
});

test("near rail profile preserves the calibrated wheel contact plane", () => {
  assert.match(trackCss, /--rail-contact-plane:\s*calc\(var\(--train-base-lift\) \+ var\(--scaled-wheel-inset\)\)/);
  assert.match(trackCss, /\.rail-near\s*\{[\s\S]*?bottom:\s*calc\(var\(--rail-contact-plane\) - var\(--rail-near-profile\)\);[\s\S]*?height:\s*var\(--rail-near-profile\)/);
  assert.match(page, /Math\.abs\(wheel\.getBoundingClientRect\(\)\.bottom - nearRail\.top\)/);
  assert.match(page, /maximumRailGap <= \.75/);
});

test("legacy fence-like pseudo track is replaced instead of double-composited", () => {
  const before = rule(".track::before");
  const after = rule(".track::after");
  assert.match(before, /z-index:\s*-1/);
  assert.match(before, /height:\s*24px/);
  assert.match(before, /filter:\s*none/);
  assert.doesNotMatch(before, /train-base-lift/);
  assert.match(after, /height:\s*7px/);
  assert.match(after, /rail-contact-plane/);
  assert.match(after, /repeating-linear-gradient/);
});

test("tie ends stay discrete instead of forming a continuous shelf", () => {
  const sleepers = rule(".sleepers");
  const tieEnds = rule(".sleepers::before");
  assert.doesNotMatch(sleepers, /box-shadow/);
  assert.match(sleepers, /rotateX\(38deg\)/);
  assert.match(tieEnds, /repeating-linear-gradient/);
  assert.match(tieEnds, /transparent 21px var\(--track-tie-pitch\)/);
});

test("scene renders one physical track with two profiled rails", () => {
  const rails = page.match(/<div className="rail rail-(?:near|far)" \/>/g) ?? [];
  assert.equal(rails.length, 2);
  assert.equal(rails.filter((rail) => rail.includes("rail-near")).length, 1);
  assert.equal(rails.filter((rail) => rail.includes("rail-far")).length, 1);
  assert.match(trackCss, /polished[\s\S]*rust-stained web[\s\S]*shadowed foot/i);
  assert.match(trackCss, /\.rail::before/);
  assert.match(trackCss, /\.rail::after/);
  assert.ok(cssNumber("--rail-near-profile") > cssNumber("--rail-far-profile"),
    "near rail must read heavier than the perspective-receding far rail");
});

test("ballast, timber and fastener layers remain structurally separate", () => {
  assert.match(page, /<div className="ballast" \/>[\s\S]*<div className="sleepers" \/>[\s\S]*rail-near[\s\S]*rail-far/);
  assert.match(trackCss, /\.ballast::before/);
  assert.match(trackCss, /\.sleepers::before/);
  assert.match(trackCss, /\.sleepers::after/);
  assert.match(trackCss, /background-size:\s*var\(--track-tie-pitch\) 100%/);
});
