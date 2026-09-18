import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const track = await readFile(new URL("../app/track-realism.css", import.meta.url), "utf8");
const animation = await readFile(new URL("../app/animation-continuity.css", import.meta.url), "utf8");
const coupling = await readFile(new URL("../app/consist-coupling.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("low-speed locomotive motion interpolates adjacent registered poses", () => {
  assert.match(page, /engine-sprite-frame engine-sprite-frame-primary/);
  assert.match(page, /engine-sprite-frame engine-sprite-frame-secondary/);
  assert.match(page, /nextLocomotiveFrame = \(locomotiveFrame \+ 1\)/);
  assert.match(page, /frameFraction \* frameFraction \* \(3 - 2 \* frameFraction\)/);
  assert.match(page, /--engine-sprite-blend/);
  assert.match(animation, /\.engine-sprite-frame-primary/);
  assert.match(animation, /\.engine-sprite-frame-secondary/);
});

test("near-field track motion has exactly one consumer and shares wheel travel calibration", () => {
  assert.equal((track.match(/var\(--track-x/g) ?? []).length, 1);
  assert.match(track, /\.sleepers[\s\S]*background-position:\s*var\(--track-x, 0px\) 0/);
  assert.doesNotMatch(track.match(/\.ballast\s*\{[\s\S]*?\n\}/)?.[0] ?? "", /track-x/);
  assert.match(page, /visualTravelRef\.current \* WHEEL_TRAVEL_CALIBRATION\) % 32/);
  assert.match(page, /const railTravel = visualTravelRef\.current \* WHEEL_TRAVEL_CALIBRATION/);
});

test("consist exposes mechanical interfaces at every vehicle boundary", () => {
  assert.match(layout, /import "\.\/consist-coupling\.css";/);
  assert.ok(layout.indexOf('import "./consist-coupling.css";') > layout.indexOf('import "./animation-continuity.css";'));
  assert.match(page, /carIndex < consistCars\.length - 1/);
  assert.match(page, /className="car-end-diaphragm"/);
  assert.match(page, /className="coupler consist-coupler"/);
  assert.match(page, /className="consist-engine-coupling"/);
  assert.match(page, /className="engine-tender-drawbar"/);
  assert.match(coupling, /left:\s*calc\(var\(--engine-left\) - 15px\)/);
  assert.match(coupling, /--tender-junction/);
});
