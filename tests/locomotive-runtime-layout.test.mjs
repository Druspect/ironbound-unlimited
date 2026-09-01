import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

import {
  LOCOMOTIVES,
  LOCOMOTIVE_RUNTIME_LAYOUTS,
  STARTER_LOCOMOTIVE_ID,
  runtimeWheelRadiusRatios,
  LOCOMOTIVE_SPRITE_RAIL_INSET,
} from "../app/locomotive-catalog.ts";
import { LOCOMOTIVE_ALIGNMENT_POINTS } from "../app/locomotive-alignment.ts";

const spriteManifest = JSON.parse(readFileSync("public/assets/locomotive-shop/v3/profiles.json", "utf8"));

test("transparent sprite margin is compensated at desktop and narrow train scales", () => {
  assert.equal(spriteManifest.rail_y, 332);
  for (const viewport of [390, 768, 1363, 1920]) {
    const consistWidth = Math.min(viewport * .94, 1640);
    const consistHeight = consistWidth / 6;
    for (const engine of LOCOMOTIVES) {
      const layout = LOCOMOTIVE_RUNTIME_LAYOUTS[engine.id];
      const scale = consistWidth * layout.totalWidth / 100 / layout.canvas.width;
      const translatedMargin = 340 * scale * LOCOMOTIVE_SPRITE_RAIL_INSET / 100;
      const tireBottom = -consistHeight * .04 + translatedMargin - (340 - spriteManifest.rail_y) * scale;
      assert.ok(Math.abs(tireBottom - (-consistHeight * .04)) < 1e-9, `${engine.id} agrees with coach baseline at ${viewport}px`);
      const radius = runtimeWheelRadiusRatios(engine.id, layout).driver * consistWidth;
      assert.ok(Math.abs(radius - spriteManifest.profiles[engine.id].axles[0].diameter * scale / 2) < 1e-9);
    }
  }
  const css = readFileSync("app/globals.css", "utf8").match(/\.engine-sprite-unit\s*\{([^}]+)\}/)[1];
  assert.match(css, /bottom: 4%/);
  assert.match(css, /var\(--sprite-rail-inset\)/);
});

const readExtendedWebpSize = (path) => {
  const header = readFileSync(path).subarray(0, 30);
  assert.equal(header.toString("ascii", 0, 4), "RIFF", `${path} is a RIFF asset`);
  assert.equal(header.toString("ascii", 8, 12), "WEBP", `${path} is a WebP asset`);
  assert.equal(header.toString("ascii", 12, 16), "VP8X", `${path} keeps an alpha-safe extended header`);
  return {
    width: 1 + header.readUIntLE(24, 3),
    height: 1 + header.readUIntLE(27, 3),
  };
};

test("every shop locomotive has a complete class-specific runtime layout", () => {
  for (const engine of LOCOMOTIVES) {
    const layout = LOCOMOTIVE_RUNTIME_LAYOUTS[engine.id];
    const alignment = LOCOMOTIVE_ALIGNMENT_POINTS[engine.id];
    const wheelGroups = engine.wheelArrangement.split("-").map(Number);

    assert.ok(engine.runtime, `${engine.name} is missing component parts`);
    for (const path of Object.values(engine.runtime)) {
      assert.ok(existsSync(`public${path}`), `${engine.name} component exists: ${path}`);
    }
    assert.ok(layout, `${engine.name} is missing runtime calibration`);
    assert.ok(alignment, `${engine.name} is missing named alignment points`);
    assert.equal(alignment.axles.filter((point) => point.kind === "leading").length, wheelGroups[0] / 2, `${engine.name} leading axles`);
    assert.equal(alignment.axles.filter((point) => point.kind === "trailing").length, wheelGroups.at(-1) / 2, `${engine.name} trailing axles`);
    assert.equal(
      alignment.axles.filter((point) => point.kind === "driver").length,
      wheelGroups.slice(1, -1).reduce((sum, wheels) => sum + wheels / 2, 0),
      `${engine.name} driving axles`,
    );
    assert.equal(alignment.rods.length, wheelGroups.length - 2, `${engine.name} rod groups`);
    assert.ok(alignment.axles.every((point) => point.x > 0 && point.x < 100 && point.bottom > 0 && point.size > 0));
    assert.equal(new Set(alignment.axles.map((point) => point.id)).size, alignment.axles.length, `${engine.name} axle names are unique`);
    assert.ok(alignment.axles.filter((point) => point.kind === "tender").length >= 4, `${engine.name} has explicit tender axles`);
    {
      for (const kind of ["previews", "sprites"]) {
        const spritePath = `public/assets/locomotive-shop/v3/${kind}/${engine.id}.webp`;
        assert.ok(existsSync(spritePath) && statSync(spritePath).size > 10_000, `${engine.name} has a complete ${kind} asset`);
      }
    }
  }
});

test("each locomotive derives motion from its own rendered wheel radii", () => {
  const radii = Object.entries(LOCOMOTIVE_RUNTIME_LAYOUTS).map(([id, layout]) => ({ id, ...runtimeWheelRadiusRatios(id, layout) }));
  for (const profile of radii) {
    assert.ok(profile.driver > profile.truck, `${profile.id} driver radius exceeds its truck wheel radius`);
    assert.ok(profile.driver > 0 && profile.truck > 0 && profile.tender > 0, `${profile.id} radii are positive`);
  }
  assert.notEqual(
    runtimeWheelRadiusRatios("prr-1361", LOCOMOTIVE_RUNTIME_LAYOUTS["prr-1361"]).driver,
    runtimeWheelRadiusRatios("southern-4501", LOCOMOTIVE_RUNTIME_LAYOUTS["southern-4501"]).driver,
    "PRR and Southern do not share a generic angular-velocity profile",
  );
});

test("all twelve calibrated layouts preserve the declared wheel arrangements", () => {
  assert.equal(Object.keys(LOCOMOTIVE_RUNTIME_LAYOUTS).length, 12);
  const driverCenters = (id) => LOCOMOTIVE_ALIGNMENT_POINTS[id].axles.filter((point) => point.kind === "driver").map((point) => point.x);
  assert.deepEqual(driverCenters(STARTER_LOCOMOTIVE_ID), [29.6, 50.9, 72.3]);
  assert.equal(LOCOMOTIVE_ALIGNMENT_POINTS.jupiter, undefined);
  assert.deepEqual(driverCenters("prr-1361"), [32, 47, 62]);
  assert.deepEqual(driverCenters("nw-1218"), [30, 40, 50, 64, 74, 84]);
  assert.deepEqual(driverCenters("big-boy-4014"), [19, 28, 37, 46, 58, 67, 76, 85]);
  assert.deepEqual(driverCenters("the-flyer-1907"), [39.5, 61]);
  assert.deepEqual(driverCenters("polar-express-1225"), [30, 43, 56, 69]);
});

test("every engine owns one immutable preview and thirty-two-frame canvas", () => {
  const spriteHashes = new Set();
  assert.deepEqual(spriteManifest.canvas, { width: 960, height: 340 });
  assert.equal(spriteManifest.rail_reference_height, 260, "headroom cannot move the rail or resize wheels");
  assert.deepEqual(JSON.parse(readFileSync("app/locomotive-registration.json", "utf8")), spriteManifest);
  assert.deepEqual(spriteManifest.animation, { frames: 32, columns: 8, direction: "clockwise" });
  for (const engine of LOCOMOTIVES) {
    const previewPath = `public/assets/locomotive-shop/v3/previews/${engine.id}.webp`;
    const spritePath = `public/assets/locomotive-shop/v3/sprites/${engine.id}.webp`;
    const profile = spriteManifest.profiles[engine.id];
    assert.deepEqual(readExtendedWebpSize(previewPath), profile.canvas, `${engine.name} preview canvas`);
    assert.deepEqual(readExtendedWebpSize(spritePath), { width: profile.canvas.width*8, height: 1360 }, `${engine.name} 8×4 frame sheet`);
    const alignedDrivers = LOCOMOTIVE_ALIGNMENT_POINTS[engine.id].axles.filter((point) => point.kind === "driver");
    assert.deepEqual(alignedDrivers.map((point) => point.x), profile.drivers, `${engine.name} sprite and motion profiles agree`);
    assert.ok(alignedDrivers.every((point) => point.size === profile.driver_size), `${engine.name} runtime radius matches rendered drivers`);
    assert.equal(profile.wheel_arrangement, engine.wheelArrangement, `${engine.name} owns its wheel arrangement`);
    assert.equal(profile.drivers.length, engine.wheelArrangement.split("-").slice(1, -1).reduce((total, count) => total + Number(count) / 2, 0));
    assert.ok(profile.body_bottom >= 0 && profile.body_bottom <= 16, `${engine.name} body is registered to its running gear`);
    assert.ok(profile.tender_bottom >= 0 && profile.tender_bottom <= 16, `${engine.name} tender is registered to its trucks`);
    assert.ok(profile.smoke_socket.x > 0 && profile.smoke_socket.y >= 0, `${engine.name} owns a smoke-stack socket`);
    assert.deepEqual(LOCOMOTIVE_RUNTIME_LAYOUTS[engine.id].smokeSocket, profile.smoke_socket, `${engine.name} consumes generated stack registration exactly`);
    assert.ok(profile.body_bounds.y >= 0 && profile.tender_bounds.y >= 0, `${engine.name} shells are not cropped`);
    assert.ok(Math.max(...Object.values(profile.support_contact_gaps_px)) <= 0, `${engine.name} EVERY axle touches supporting chassis`);
    spriteHashes.add(createHash("sha256").update(readFileSync(spritePath)).digest("hex"));
  }
  assert.equal(spriteHashes.size, 12, "no locomotive can inherit another model's sprite sheet");
  const puff = "public/assets/locomotive-shop/v3/exhaust-puff.webp";
  assert.ok(existsSync(puff) && statSync(puff).size > 1_000, "textured exhaust exists");
  assert.deepEqual(readExtendedWebpSize(puff), { width: 256, height: 256 });
});

test("targeted axle tuning leaves Southern drivers and PRR rear leading axle unchanged", () => {
  const southern = spriteManifest.profiles["southern-4501"];
  assert.deepEqual(southern.trailing, [17.5]);
  assert.deepEqual(southern.drivers, [37, 50, 63, 76]);
  assert.equal(southern.axles.find((a) => a.kind === "trailing").diameter, 55);
  assert.equal(southern.axles.find((a) => a.kind === "leading").diameter, 40);
  assert.deepEqual(spriteManifest.profiles["prr-1361"].leading, [87, 94.5]);
});

test("Big Boy's longer coupling preserves its on-track body and wheel scale", () => {
  const layout = LOCOMOTIVE_RUNTIME_LAYOUTS["big-boy-4014"];
  assert.deepEqual(layout.canvas, { width: 996, height: 340 });
  assert.equal(spriteManifest.profiles["big-boy-4014"].coupling_extension, 36);
  assert.ok(Math.abs(layout.totalWidth/layout.canvas.width-52.2/960) < 1e-12);
  for (const [id, profile] of Object.entries(spriteManifest.profiles)) {
    if (id !== "big-boy-4014") assert.deepEqual(profile.canvas, { width: 960, height: 340 });
  }
});

test("passenger drivers read larger while rear trucks remain subordinate", () => {
  const radius = (id) => runtimeWheelRadiusRatios(id, LOCOMOTIVE_RUNTIME_LAYOUTS[id]).driver;
  assert.ok(radius("prr-1361") > radius("southern-4501") * 1.1);
  assert.deepEqual(spriteManifest.profiles["atsf-3751"].drivers, [35, 48.5, 62, 75.5]);
  assert.ok(spriteManifest.profiles["atsf-3751"].axles
    .filter((axle) => axle.kind === "driver")
    .every((axle) => axle.diameter === 86));
  assert.equal(radius("atsf-3751"), radius("up-844"));
  assert.ok(radius("atsf-3751") > radius("nw-611") * 1.1);
  assert.ok(radius("up-844") > radius("nw-611") * 1.1);
  for (const id of ["southern-4501", "prr-1361", "nkp-765", "atsf-3751", "nw-611", "up-844", "nw-1218", "challenger-3985", "the-flyer-1907", "polar-express-1225"]) {
    const axles = spriteManifest.profiles[id].axles;
    const diameter = (kind) => axles.find((a) => a.kind === kind).diameter;
    assert.ok(diameter("leading") < diameter("trailing"), `${id} rear truck exceeds pilot size`);
    assert.ok(diameter("trailing") < diameter("driver"), `${id} rear truck stays below driver size`);
  }
});

test("The Flyer and Polar Express keep their reference-specific running gear", () => {
  const flyer = spriteManifest.profiles["the-flyer-1907"];
  const polar = spriteManifest.profiles["polar-express-1225"];
  assert.equal(flyer.wheel_arrangement, "4-4-2");
  assert.equal(flyer.axles.filter((a) => a.kind === "leading").length, 2);
  assert.equal(flyer.axles.filter((a) => a.kind === "driver").length, 2);
  assert.equal(flyer.axles.filter((a) => a.kind === "trailing").length, 1);
  assert.equal(polar.wheel_arrangement, "2-8-4");
  assert.equal(polar.axles.filter((a) => a.kind === "leading").length, 1);
  assert.equal(polar.axles.filter((a) => a.kind === "driver").length, 4);
  assert.equal(polar.axles.filter((a) => a.kind === "trailing").length, 2);
});

test("the starter's real rendered axles share the same rail as the entire fleet", () => {
  const starter = spriteManifest.profiles[STARTER_LOCOMOTIVE_ID];
  assert.equal(starter.axles.filter((a) => a.kind === "leading").length, 2);
  for (const a of starter.axles) {
    assert.equal(a.cy + a.diameter / 2, spriteManifest.rail_y);
  }
  assert.ok(starter.axles.filter((a) => a.kind === "leading").every((a) => a.diameter < starter.axles[0].diameter / 2));
});
