import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateTrainSceneGeometry,
  PASSENGER_ANCHOR_VIEWPORT_RATIO,
} from "../app/train-geometry.ts";
import {
  calculateConsistBoundaryGeometry,
} from "../app/consist-boundary-geometry.ts";
import {
  CANONICAL_COACH_RENDER_WIDTH,
  engineRenderWidth,
  FLEET_PROPORTIONS,
} from "../app/fleet-proportions.ts";

const CAR_WIDTH = CANONICAL_COACH_RENDER_WIDTH;
const ENGINE_IDS = Object.keys(FLEET_PROPORTIONS);
const VIEWPORTS = [320, 360, 375, 390, 430, 768, 932, 1024, 1365, 1440, 1920, 2560];
const CAR_COUNTS = [3, 4, 5, 6];

function geometryFor(carCount, engineId, viewport, mode = "auto") {
  const consist = calculateConsistBoundaryGeometry(
    carCount,
    CAR_WIDTH,
    engineRenderWidth(engineId),
  );
  return {
    consist,
    scene: calculateTrainSceneGeometry(
      viewport,
      consist.passengerWorldWidth,
      consist.trainWorldWidth,
      mode,
    ),
  };
}

test("automatic camera contains every 3-6 car fleet combination at target viewports", () => {
  for (const viewport of VIEWPORTS) {
    for (const carCount of CAR_COUNTS) {
      for (const engineId of ENGINE_IDS) {
        const { consist, scene } = geometryFor(carCount, engineId, viewport);
        const normalizedViewport = Math.max(320, viewport);
        const anchor = normalizedViewport * PASSENGER_ANCHOR_VIEWPORT_RATIO;
        const fullTrainLeft =
          anchor - consist.passengerWorldWidth / 2 * scene.cameraScale;
        const fullTrainRight =
          anchor +
          (consist.trainWorldWidth - consist.passengerWorldWidth / 2) *
            scene.cameraScale;

        assert.ok(
          fullTrainLeft >= -0.01,
          `${viewport}px / ${carCount} cars / ${engineId}: left edge ${fullTrainLeft}`,
        );
        assert.ok(
          fullTrainRight <= normalizedViewport + 0.01,
          `${viewport}px / ${carCount} cars / ${engineId}: right edge ${fullTrainRight}`,
        );
      }
    }
  }
});

test("platform stays on-screen and covers the full spaced passenger consist", () => {
  for (const viewport of VIEWPORTS) {
    for (const carCount of CAR_COUNTS) {
      for (const engineId of ENGINE_IDS) {
        const { scene } = geometryFor(carCount, engineId, viewport);
        const normalizedViewport = Math.max(320, viewport);
        const anchor = normalizedViewport * PASSENGER_ANCHOR_VIEWPORT_RATIO;
        const platformLeft = anchor - scene.platformRenderedWidth / 2;
        const platformRight = anchor + scene.platformRenderedWidth / 2;

        assert.ok(
          platformLeft >= -0.01,
          `${viewport}px / ${carCount} cars / ${engineId}: platform clips left`,
        );
        assert.ok(
          platformRight <= normalizedViewport + 0.01,
          `${viewport}px / ${carCount} cars / ${engineId}: platform clips right`,
        );
        assert.ok(
          scene.platformUsableLeft <= scene.passengerLeft + 0.01,
          `${viewport}px / ${carCount} cars / ${engineId}: left passenger edge not covered`,
        );
        assert.ok(
          scene.platformUsableRight >= scene.passengerRight - 0.01,
          `${viewport}px / ${carCount} cars / ${engineId}: right passenger edge not covered`,
        );
      }
    }
  }
});

test("manual camera modes never crop a spaced consist", () => {
  for (const mode of ["close", "standard", "wide"]) {
    for (const viewport of VIEWPORTS) {
      for (const carCount of CAR_COUNTS) {
        for (const engineId of ENGINE_IDS) {
          const { consist, scene } = geometryFor(carCount, engineId, viewport, mode);
          const normalizedViewport = Math.max(320, viewport);
          const anchor = normalizedViewport * PASSENGER_ANCHOR_VIEWPORT_RATIO;
          const left =
            anchor - consist.passengerWorldWidth / 2 * scene.cameraScale;
          const right =
            anchor +
            (consist.trainWorldWidth - consist.passengerWorldWidth / 2) *
              scene.cameraScale;

          assert.ok(left >= -0.01, `${mode}: ${viewport}px / ${carCount} / ${engineId} left`);
          assert.ok(right <= normalizedViewport + 0.01, `${mode}: ${viewport}px / ${carCount} / ${engineId} right`);
        }
      }
    }
  }
});
