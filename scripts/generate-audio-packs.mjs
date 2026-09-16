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

/*
 * A steam beat must begin and end near zero. The old exponential pulse jumped
 * from its decayed tail directly back to 1 at every cadence boundary, which
 * created the click/snap that was audible in the original packs.
 */
function eventEnvelope(time, cadence, attackSeconds = 0.024, decaySeconds = 0.17, offsetSeconds = 0) {
  const period = 1 / cadence;
  const shifted = time + offsetSeconds;
  const phaseSeconds = ((shifted % period) + period) % period;
  const attack = 1 - Math.exp(-phaseSeconds / Math.max(0.001, attackSeconds));
  const decay = Math.exp(-phaseSeconds / Math.max(0.001, decaySeconds));
  return attack * decay;
}

function smoothStep(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function renderPack(kind) {
  const samples = new Int16Array(frames);
  const noise = randomFactory(0x1b0a5d + kind * 1907);
  let softNoise = 0;
  let windNoise = 0;

  for (let index = 0; index < frames; index += 1) {
    const time = index / sampleRate;
    const rawNoise = noise();
    softNoise = softNoise * 0.94 + rawNoise * 0.06;
    windNoise = windNoise * 0.992 + rawNoise * 0.008;
    let value = 0;

    if (kind === 0) {
      // Warm four-beat road exhaust: low mechanical body plus broad steam hiss.
      const envelope = eventEnvelope(time, 2.4, 0.026, 0.18);
      const exhaustBody = Math.sin(time * Math.PI * 2 * 68) * 0.42 +
        Math.sin(time * Math.PI * 2 * 104) * 0.12 + softNoise * 0.34;
      const railEnvelope = eventEnvelope(time, 1.2, 0.009, 0.055, 0.03);
      const railJoint = railEnvelope * Math.sin(time * Math.PI * 2 * 360) * 0.045;
      value = envelope * exhaustBody * 0.58 + railJoint + windNoise * 0.12;
    } else if (kind === 1) {
      // Heavy articulated analogue: slower, deeper beat with a soft valley echo.
      const directEnvelope = eventEnvelope(time, 1.82, 0.032, 0.24);
      const echoEnvelope = eventEnvelope(time, 1.82, 0.045, 0.31, -0.31);
      const direct = directEnvelope * (
        Math.sin(time * Math.PI * 2 * 49) * 0.48 +
        Math.sin(time * Math.PI * 2 * 78) * 0.16 + softNoise * 0.29
      );
      const echo = echoEnvelope * (
        Math.sin(time * Math.PI * 2 * 43) * 0.16 + windNoise * 0.08
      );
      const railEnvelope = eventEnvelope(time, 0.91, 0.012, 0.07, 0.07);
      const railJoint = railEnvelope * Math.sin(time * Math.PI * 2 * 285) * 0.04;
      value = direct * 0.63 + echo + railJoint + windNoise * 0.10;
    } else {
      // Winter excursion analogue: muted exhaust, moving air, and a distant bell.
      const envelope = eventEnvelope(time, 2.05, 0.035, 0.23);
      const chuff = envelope * (
        Math.sin(time * Math.PI * 2 * 57) * 0.30 + softNoise * 0.19
      );
      const wind = windNoise * 0.52 + Math.sin(time * Math.PI * 2 * 0.17) * windNoise * 0.12;
      const bellEnvelope = eventEnvelope(time, 0.1, 0.025, 1.0, -2.0);
      const bell = (
        Math.sin(time * Math.PI * 2 * 784) * 0.052 +
        Math.sin(time * Math.PI * 2 * 1176) * 0.018
      ) * bellEnvelope;
      value = chuff * 0.58 + wind * 0.24 + bell;
    }

    // Gentle saturation prevents isolated peaks from becoming sharp digital
    // transients while retaining the low-frequency body of the exhaust beat.
    value = Math.tanh(value * 1.15) * 0.82;

    // Silence the file seam with a smooth, short crossfade-shaped edge so the
    // HTMLAudioElement can loop without a discontinuity at the ten-second wrap.
    const edgeSamples = Math.round(sampleRate * 0.08);
    const edge = Math.min(1, index / edgeSamples, (frames - index - 1) / edgeSamples);
    const fade = smoothStep(edge);
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
