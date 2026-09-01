import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import { AUDIO_PACKS, DEFAULT_AUDIO_PACK, audioPackFor, isAudioPackId, soundscapeMix } from "../app/audio-packs.ts";

function webpDimensions(bytes) {
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
  assert.equal(bytes.toString("ascii", 12, 16), "VP8X");
  return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3), alpha: (bytes[20] & 0x10) !== 0 };
}

test("all three audio packs are unique, valid, and selectable", () => {
  assert.equal(AUDIO_PACKS.length, 3);
  assert.equal(new Set(AUDIO_PACKS.map(({ id }) => id)).size, 3);
  assert.equal(new Set(AUDIO_PACKS.map(({ loopAsset }) => loopAsset)).size, 3);
  assert.ok(isAudioPackId(DEFAULT_AUDIO_PACK));
  for (const pack of AUDIO_PACKS) {
    assert.equal(audioPackFor(pack.id), pack);
    assert.ok(pack.baseVolume >= 0.25 && pack.baseVolume <= 0.4);
    assert.match(pack.loopAsset, /^\/assets\/audio\/[a-z-]+-loop\.wav$/);
  }
});

test("audio mixing follows motion, work, service, and pause boundaries", () => {
  for (const pack of AUDIO_PACKS) {
    const idle = soundscapeMix(pack.id, { speedMph: 0, throttle: 0, paused: false, servicing: false });
    const service = soundscapeMix(pack.id, { speedMph: 0, throttle: 0, paused: false, servicing: true });
    const working = soundscapeMix(pack.id, { speedMph: 28, throttle: 65, paused: false, servicing: false });
    const highball = soundscapeMix(pack.id, { speedMph: 70, throttle: 85, paused: false, servicing: false });
    const paused = soundscapeMix(pack.id, { speedMph: 70, throttle: 85, paused: true, servicing: false });
    assert.ok(service.volume > idle.volume, `${pack.id} service ambience`);
    assert.ok(working.volume > idle.volume, `${pack.id} working volume`);
    assert.ok(highball.playbackRate > working.playbackRate, `${pack.id} speed pitch`);
    assert.ok(highball.volume <= 0.5 && highball.playbackRate <= 1.1, `${pack.id} safe mix ceiling`);
    assert.equal(paused.volume, 0, `${pack.id} pause silence`);
  }
});

test("each generated soundscape is a distinct loopable PCM wave", async () => {
  const hashes = new Set();
  for (const pack of AUDIO_PACKS) {
    const file = new URL(`../public${pack.loopAsset}`, import.meta.url);
    const bytes = await readFile(file);
    const info = await stat(file);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WAVE");
    assert.equal(bytes.readUInt16LE(20), 1, `${pack.id} PCM encoding`);
    assert.equal(bytes.readUInt16LE(22), 1, `${pack.id} mono channel`);
    assert.equal(bytes.readUInt32LE(24), 22050, `${pack.id} sample rate`);
    assert.equal(bytes.readUInt16LE(34), 16, `${pack.id} bit depth`);
    assert.ok(info.size > 400_000 && info.size < 500_000, `${pack.id} loop size ${info.size}`);
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
  }
  assert.equal(hashes.size, AUDIO_PACKS.length, "each sound pack needs different source audio");
});

test("every station has original high-detail alpha-safe service artwork", async () => {
  const names = ["cinder-flats", "copper-wash", "saltworks", "timberline", "summit-house", "stillwater"];
  const hashes = new Set();
  for (const name of names) {
    const file = new URL(`../public/assets/stations/service/v1/${name}.webp`, import.meta.url);
    const bytes = await readFile(file);
    const info = await stat(file);
    assert.deepEqual(webpDimensions(bytes), { width: 1774, height: 887, alpha: true }, name);
    assert.ok(info.size >= 200_000 && info.size <= 350_000, `${name} optimized size ${info.size}`);
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
  }
  assert.equal(hashes.size, names.length, "station service scenes must not be recolors or duplicate files");
});

test("the checked-in generator names every production audio asset", async () => {
  const generator = await readFile(new URL("../scripts/generate-audio-packs.mjs", import.meta.url), "utf8");
  for (const pack of AUDIO_PACKS) assert.match(generator, new RegExp(pack.loopAsset.split("/").at(-1).replaceAll(".", "\\.")));
});
