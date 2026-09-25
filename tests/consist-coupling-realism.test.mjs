import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

import {
  COACH_COUPLING_GAP,
  ENGINE_COUPLING_GAP,
  MAX_VISUAL_SLACK_PX,
  couplingSlackOffset,
  engineLeftOffset,
  passengerCarLeftOffset,
  passengerConsistWorldWidth,
  totalTrainWorldWidth,
} from "../app/consist-coupling.ts";
import { CANONICAL_COACH_RENDER_WIDTH } from "../app/fleet-proportions.ts";

const CAR = CANONICAL_COACH_RENDER_WIDTH;

test("coach and engine boundaries reserve positive mechanical space", () => {
  for (const count of [3, 4, 5, 6]) {
    const passengerWidth = passengerConsistWorldWidth(count, CAR);
    assert.equal(passengerWidth, count * CAR + (count - 1) * COACH_COUPLING_GAP);
    assert.equal(engineLeftOffset(count, CAR), passengerWidth + ENGINE_COUPLING_GAP);
    assert.equal(totalTrainWorldWidth(count, CAR, 500), passengerWidth + ENGINE_COUPLING_GAP + 500);
    for (let index = 1; index < count; index++) {
      assert.equal(passengerCarLeftOffset(index, CAR) - passengerCarLeftOffset(index - 1, CAR) - CAR, COACH_COUPLING_GAP);
    }
  }
});

test("visual slack is bounded and distinguishes pull from compression", () => {
  assert.equal(couplingSlackOffset(0, 0), 0);
  assert.equal(couplingSlackOffset(100, 0), MAX_VISUAL_SLACK_PX);
  assert.equal(couplingSlackOffset(0, 1), -MAX_VISUAL_SLACK_PX);
  assert.ok(couplingSlackOffset(55, .2) > 0);
  assert.ok(couplingSlackOffset(10, .7) < 0);
});

test("render contract includes visible draft gear and trainlines", () => {
  const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../app/consist-coupling.css", import.meta.url), "utf8");
  assert.match(page, /passengerCarLeftOffset\(carIndex, carWidth\)/);
  assert.match(page, /coupler-air-hose/);
  assert.match(page, /coupler-steam-line/);
  assert.match(page, /coach coupling continuity/);
  assert.match(page, /coach-to-tender coupling continuity/);
  assert.match(css, /var\(--coach-coupling-gap/);
  assert.match(css, /var\(--engine-coupling-gap/);
  assert.match(css, /engine-tender-drawbar/);
  assert.match(css, /var\(--coupler-slack/);
});
