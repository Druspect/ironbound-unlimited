import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sampleRate = 22050;
const seconds = 10;
const frames = sampleRate * seconds;

function randomFactory(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff * 2 - 1;
  };
}

function pulse(time, cadence, width = 0.075) {
  const phase = (time * cadence) % 1;
  return Math.exp(-phase / width);
}

function renderPack(kind) {
  const samples = new Int16Array(frames);
  const noise = randomFactory(0x1b0a5d + kind * 1907);
  let filteredNoise = 0;
  for (let index = 0; index < frames; index += 1) {
    const time = index / sampleRate;
    const rawNoise = noise();
    filteredNoise = filteredNoise * 0.985 + rawNoise * 0.015;
    let value = 0;

    if (kind === 0) {
      const chuff = pulse(time, 2.4) * (Math.sin(time * Math.PI * 2 * 72) * 0.55 + rawNoise * 0.28);
      const railJoint = pulse(time + 0.02, 1.2, 0.013) * Math.sin(time * Math.PI * 2 * 690) * 0.12;
      value = chuff * 0.48 + railJoint + filteredNoise * 0.32;
    } else if (kind === 1) {
      const direct = pulse(time, 1.82) * (Math.sin(time * Math.PI * 2 * 54) * 0.62 + rawNoise * 0.23);
      const echo = pulse(Math.max(0, time - 0.34), 1.82, 0.12) * Math.sin(time * Math.PI * 2 * 49) * 0.19;
      const joint = pulse(time, 0.91, 0.014) * Math.sin(time * Math.PI * 2 * 510) * 0.15;
      value = direct * 0.52 + echo + joint + filteredNoise * 0.25;
    } else {
      const chuff = pulse(time, 2.05, 0.11) * (Math.sin(time * Math.PI * 2 * 61) * 0.35 + rawNoise * 0.14);
      const wind = filteredNoise * 0.62 + Math.sin(time * Math.PI * 2 * 0.17) * filteredNoise * 0.18;
      const bellEnvelope = Math.max(0, 1 - ((time + 8) % 10) / 1.8);
      const bell = Math.sin(time * Math.PI * 2 * 784) * bellEnvelope * 0.07;
      value = chuff * 0.45 + wind * 0.33 + bell;
    }

    const fade = Math.min(1, index / 900, (frames - index - 1) / 900);
    samples[index] = Math.round(Math.max(-1, Math.min(1, value * fade)) * 32767);
  }
  return samples;
}

function wavBuffer(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index += 1) buffer.writeInt16LE(samples[index], 44 + index * 2);
  return buffer;
}

const output = resolve("public/assets/audio");
await mkdir(output, { recursive: true });
for (const [index, filename] of ["heritage-steam-loop.wav", "mountain-echo-loop.wav", "winter-limited-loop.wav"].entries()) {
  const path = resolve(output, filename);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, wavBuffer(renderPack(index)));
}
