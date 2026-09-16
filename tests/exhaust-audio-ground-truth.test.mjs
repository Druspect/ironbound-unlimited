import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createExhaustAudioState,
  exhaustBeatGain,
  stepExhaustAudio,
} from "../app/exhaust-audio.ts";
import { createExhaustMotion, createExhaustState, stepExhaust } from "../app/locomotive-exhaust.ts";

function simulateRevolution(beatsPerRevolution, fps = 60) {
  const state = createExhaustAudioState();
  const motion = { ...createExhaustMotion(), paused: false, speed: 32, load: 0.62, driverRadius: 30 };
  stepExhaustAudio(state, motion, beatsPerRevolution);
  let events = 0;
  const circumference = 2 * Math.PI * motion.driverRadius;
  for (let frame = 1; frame <= fps; frame += 1) {
    motion.travel = circumference * frame / fps + 0.001;
    events += stepExhaustAudio(state, motion, beatsPerRevolution);
  }
  return events;
}

test("audible exhaust cadence is four beats per conventional revolution and eight when articulated", () => {
  assert.equal(simulateRevolution(4), 4);
  assert.equal(simulateRevolution(8), 8);
});

test("visual exhaust honors the same registered engine cadence", () => {
  const state = createExhaustState();
  const motion = { ...createExhaustMotion(), paused: false, speed: 32, load: 0.62, driverRadius: 30, beatsPerRevolution: 8 };
  stepExhaust(state, motion, 0);
  const circumference = 2 * Math.PI * motion.driverRadius;
  for (let frame = 1; frame <= 60; frame += 1) {
    motion.travel = circumference * frame / 60 + 0.001;
    stepExhaust(state, motion, 1 / 60);
  }
  assert.equal(state.particles.length, 8);
});

test("pause or tab-style travel jumps cannot create a catch-up exhaust burst", () => {
  const state = createExhaustAudioState();
  const motion = { ...createExhaustMotion(), paused: false, speed: 30, load: 0.7, driverRadius: 30 };
  stepExhaustAudio(state, motion, 4);
  motion.travel = 20;
  stepExhaustAudio(state, motion, 4);
  motion.paused = true;
  motion.travel += 10_000;
  assert.equal(stepExhaustAudio(state, motion, 4), 0);
  motion.paused = false;
  assert.equal(stepExhaustAudio(state, motion, 4), 0);
});

test("throttle changes exhaust force without changing wheel-derived cadence", () => {
  const lowState = createExhaustAudioState();
  const highState = createExhaustAudioState();
  const low = { ...createExhaustMotion(), paused: false, speed: 35, load: 0.2, driverRadius: 30 };
  const high = { ...low, load: 0.9 };
  stepExhaustAudio(lowState, low, 4);
  stepExhaustAudio(highState, high, 4);
  low.travel = high.travel = 2 * Math.PI * low.driverRadius + 0.001;
  assert.equal(stepExhaustAudio(lowState, low, 4), stepExhaustAudio(highState, high, 4));
  assert.ok(exhaustBeatGain({ exhaustCharacter: "balanced" }, high) > exhaustBeatGain({ exhaustCharacter: "balanced" }, low));
});

function parseWav(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WAVE");
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bits = buffer.readUInt16LE(34);
  const dataBytes = buffer.readUInt32LE(40);
  const samples = new Int16Array(buffer.buffer, buffer.byteOffset + 44, dataBytes / 2);
  return { channels, sampleRate, bits, samples };
}

const AUDIO_DIR = new URL("../public/assets/audio/", import.meta.url);

async function readWav(name) {
  return parseWav(await readFile(new URL(name, AUDIO_DIR)));
}

test("generated exhaust one-shots are finite smooth pressure bodies, not click impulses", async () => {
  const names = ["exhaust-light.wav", "exhaust-balanced.wav", "exhaust-heavy.wav", "exhaust-articulated.wav"];
  const fingerprints = new Set();
  for (const name of names) {
    const wav = await readWav(name);
    assert.equal(wav.channels, 1);
    assert.equal(wav.sampleRate, 22050);
    assert.equal(wav.bits, 16);
    const duration = wav.samples.length / wav.sampleRate;
    assert.ok(duration >= 0.30 && duration <= 0.56, `${name} duration ${duration}`);
    const peak = Math.max(...wav.samples.map((sample) => Math.abs(sample)));
    assert.ok(peak > 8_000, `${name} has no pressure body`);
    assert.ok(Math.abs(wav.samples[0]) < 10);
    assert.ok(Math.abs(wav.samples[wav.samples.length - 1]) < 10);
    let maxDelta = 0;
    for (let index = 1; index < wav.samples.length; index += 1) {
      maxDelta = Math.max(maxDelta, Math.abs(wav.samples[index] - wav.samples[index - 1]));
    }
    assert.ok(maxDelta / peak < 0.72, `${name} contains a click-like sample jump`);
    const checksum = wav.samples.reduce((sum, sample, index) => (sum + sample * ((index % 97) + 1)) | 0, 0);
    fingerprints.add(`${wav.samples.length}:${checksum}`);
  }
  assert.equal(fingerprints.size, names.length);
});

test("production generator owns the multi-chime whistle and all synchronized exhaust assets", async () => {
  const generator = await readFile(new URL("../scripts/generate-audio-packs.mjs", import.meta.url), "utf8");
  for (const asset of [
    "exhaust-light.wav",
    "exhaust-balanced.wav",
    "exhaust-heavy.wav",
    "exhaust-articulated.wav",
    "ironbound-steam-whistle.wav",
  ]) assert.match(generator, new RegExp(asset.replaceAll(".", "\\.")));

  const whistle = await readWav("ironbound-steam-whistle.wav");
  const duration = whistle.samples.length / whistle.sampleRate;
  assert.ok(duration > 2.4 && duration < 2.5);
  const peak = Math.max(...whistle.samples.map((sample) => Math.abs(sample)));
  assert.ok(peak > 10_000);
  assert.ok(Math.abs(whistle.samples[0]) < 10);
  assert.ok(Math.abs(whistle.samples[whistle.samples.length - 1]) < 100);
});
