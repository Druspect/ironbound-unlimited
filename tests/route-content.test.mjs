import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import {
  ROUTE_BIOMES,
  ROUTE_LANDMARKS,
  ROUTE_TILES_PER_BIOME,
  landmarksForRouteTile,
} from "../app/route-content.ts";

test("Stage F route content preserves six five-tile biome territories", () => {
  assert.equal(ROUTE_BIOMES.length, 6);
  assert.equal(ROUTE_TILES_PER_BIOME, 5);
  assert.equal(new Set(ROUTE_BIOMES.map((biome) => biome.id)).size, 6);
  assert.equal(new Set(ROUTE_BIOMES.map((biome) => biome.asset)).size, 6);
});

test("every authoritative biome image exists in public assets", () => {
  for (const biome of ROUTE_BIOMES) {
    assert.ok(existsSync(`public${biome.asset}`), `missing ${biome.id} asset`);
  }
});

test("line-side landmarks are bounded and distributed across every biome", () => {
  for (const landmark of ROUTE_LANDMARKS) {
    assert.ok(landmark.tile >= 0 && landmark.tile < ROUTE_TILES_PER_BIOME);
    assert.ok(landmark.leftPercent >= 10 && landmark.leftPercent <= 90);
    assert.ok(landmark.scale >= .6 && landmark.scale <= 1.2);
  }
  for (const biome of ROUTE_BIOMES) {
    const local = ROUTE_LANDMARKS.filter((landmark) => landmark.biome === biome.id);
    assert.ok(local.length >= 2, `${biome.name} needs more than one route identity cue`);
    assert.ok(new Set(local.map((landmark) => landmark.kind)).size >= 2);
  }
});

test("tile lookup only returns landmarks owned by that biome and tile", () => {
  ROUTE_BIOMES.forEach((biome, biomeIndex) => {
    for (let tile = 0; tile < ROUTE_TILES_PER_BIOME; tile += 1) {
      for (const landmark of landmarksForRouteTile(biomeIndex, tile)) {
        assert.equal(landmark.biome, biome.id);
        assert.equal(landmark.tile, tile);
      }
    }
  });
  assert.deepEqual(landmarksForRouteTile(999, 0), []);
});
