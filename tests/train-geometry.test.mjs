import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateTrainSceneGeometry,
  PASSENGER_ANCHOR_VIEWPORT_RATIO,
} from "../app/train-geometry.ts";

const CAR_WIDTH = 190;
const ENGINE_WIDTHS = [420, 546];
const VIEWPORTS = [390, 768, 1365, 1920];

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

test("platform usable span covers every passenger car for three and six cars", () => {
  for (const viewport of VIEWPORTS) {
    for (const carCount of [3, 6]) {
      const passengerWidth = carCount * CAR_WIDTH;
      const geometry = calculateTrainSceneGeometry(viewport, passengerWidth, passengerWidth + ENGINE_WIDTHS[1], "auto");
      assert.ok(geometry.platformUsableLeft <= geometry.passengerLeft - 15, `${viewport}px ${carCount}-car platform left`);
      assert.ok(geometry.platformUsableRight >= geometry.passengerRight + 15, `${viewport}px ${carCount}-car platform right`);
    }
  }
});

test("manual camera modes may widen but never crop the consist", () => {
  const passengerWidth = 6 * CAR_WIDTH;
  const trainWidth = passengerWidth + ENGINE_WIDTHS[1];
  for (const mode of ["close", "standard", "wide"]) {
    const geometry = calculateTrainSceneGeometry(768, passengerWidth, trainWidth, mode);
    const anchor = 768 * PASSENGER_ANCHOR_VIEWPORT_RATIO;
    assert.ok(anchor - passengerWidth / 2 * geometry.cameraScale >= 0);
    assert.ok(anchor + (trainWidth - passengerWidth / 2) * geometry.cameraScale <= 768);
  }
});
