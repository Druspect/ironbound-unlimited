import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import {
  ROUTE_BIOMES,
  ROUTE_LANDMARKS,
  ROUTE_EVENTS,
  ROUTE_STATION_CONTENT,
  ROUTE_TILES_PER_BIOME,
  blendBiomeTheme,
  eventsForRouteTile,
  landmarksForRouteTile,
  stationContentFor,
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


test("biome themes blend continuously without mutating route identity", () => {
  const a = blendBiomeTheme(0, 1, 0);
  const b = blendBiomeTheme(0, 1, 1);
  const mid = blendBiomeTheme(0, 1, .5);
  assert.notEqual(a.sky, b.sky);
  assert.notEqual(mid.sky, a.sky);
  assert.notEqual(mid.sky, b.sky);
  assert.ok(mid.scrubSaturation > 0);
  assert.deepEqual(blendBiomeTheme(0, 1, -10), a);
  assert.deepEqual(blendBiomeTheme(0, 1, 10), b);
});

test("all six scheduled stations have distinct presentation identities", () => {
  const entries = Object.values(ROUTE_STATION_CONTENT);
  assert.equal(entries.length, 6);
  assert.equal(new Set(entries.map((station) => station.identity)).size, 6);
  assert.equal(entries.filter((station) => station.terminal).length, 1);
  assert.equal(stationContentFor("stillwater").role, "terminal");
  assert.equal(stationContentFor("unknown").terminal, false);
});


test("route events are deterministic decorative beats spread across the journey", () => {
  assert.equal(ROUTE_EVENTS.length, 7);
  assert.equal(new Set(ROUTE_EVENTS.map((event) => event.id)).size, ROUTE_EVENTS.length);
  assert.equal(new Set(ROUTE_EVENTS.map((event) => event.biome)).size, 6);
  for (const event of ROUTE_EVENTS) {
    assert.ok(event.tile >= 0 && event.tile < ROUTE_TILES_PER_BIOME);
    assert.ok(event.leftPercent >= 10 && event.leftPercent <= 90);
  }
  assert.equal(eventsForRouteTile(0, 2)[0].id, "plains-cattle");
  assert.deepEqual(eventsForRouteTile(999, 2), []);
});
