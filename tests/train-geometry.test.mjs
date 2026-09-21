import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateTrainSceneGeometry,
  PASSENGER_ANCHOR_VIEWPORT_RATIO,
} from "../app/train-geometry.ts";
import {
  CANONICAL_COACH_RENDER_WIDTH,
  engineRenderWidth,
  FLEET_PROPORTIONS,
} from "../app/fleet-proportions.ts";

const CAR_WIDTH = CANONICAL_COACH_RENDER_WIDTH;
const ENGINE_WIDTHS = Object.keys(FLEET_PROPORTIONS).map((id) => engineRenderWidth(id));
const VIEWPORTS = [390, 768, 932, 1365, 1920];

test("automatic camera contains three- and six-car trains at every target viewport", () => {
  for (const viewport of VIEWPORTS) {
    for (const carCount of [3, 6]) {
      for (const engineWidth of ENGINE_WIDTHS) {
        const passengerWidth = carCount * CAR_WIDTH;
        const geometry = calculateTrainSceneGeometry(viewport, passengerWidth, passengerWidth + engineWidth, "auto");
        const anchor = Math.max(320, viewport) * PASSENGER_ANCHOR_VIEWPORT_RATIO;
        const fullTrainLeft = anchor - passengerWidth / 2 * geometry.cameraScale;
        const fullTrainRight = anchor + (passengerWidth / 2 + engineWidth) * geometry.cameraScale;
        assert.ok(fullTrainLeft >= -0.01, `${viewport}px ${carCount}-car left edge`);
        assert.ok(fullTrainRight <= Math.max(320, viewport) + .01, `${viewport}px ${carCount}-car right edge`);
      }
    }
  }
});

test("platform stays on-screen while covering every passenger car", () => {
  for (const viewport of VIEWPORTS) {
    for (const carCount of [3, 6]) {
      for (const engineWidth of ENGINE_WIDTHS) {
        const passengerWidth = carCount * CAR_WIDTH;
        const geometry = calculateTrainSceneGeometry(viewport, passengerWidth, passengerWidth + engineWidth, "auto");
        const anchor = Math.max(320, viewport) * PASSENGER_ANCHOR_VIEWPORT_RATIO;
        const platformLeft = anchor - geometry.platformRenderedWidth / 2;
        const platformRight = anchor + geometry.platformRenderedWidth / 2;
        assert.ok(platformLeft >= -0.01, `${viewport}px ${carCount}-car platform clips left`);
        assert.ok(platformRight <= Math.max(320, viewport) + .01, `${viewport}px ${carCount}-car platform clips right`);
        assert.ok(geometry.platformUsableLeft <= geometry.passengerLeft - 9.9, `${viewport}px ${carCount}-car platform left coverage`);
        assert.ok(geometry.platformUsableRight >= geometry.passengerRight + 9.9, `${viewport}px ${carCount}-car platform right coverage`);
      }
    }
  }
});

test("manual camera modes may widen but never crop the consist", () => {
  const passengerWidth = 6 * CAR_WIDTH;
  const trainWidth = passengerWidth + Math.max(...ENGINE_WIDTHS);
  for (const mode of ["close", "standard", "wide"]) {
    const geometry = calculateTrainSceneGeometry(768, passengerWidth, trainWidth, mode);
    const anchor = 768 * PASSENGER_ANCHOR_VIEWPORT_RATIO;
    assert.ok(anchor - passengerWidth / 2 * geometry.cameraScale >= 0);
    assert.ok(anchor + (trainWidth - passengerWidth / 2) * geometry.cameraScale <= 768);
  }
});
