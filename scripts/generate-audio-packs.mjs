import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sampleRate = 22050;
const seconds = 16;
const frames = sampleRate * seconds;

function randomFactory(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff * 2 - 1;
  };
}

function smoothStep(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

/*
 * Model an exhaust release as a finite pressure event rather than an impulse.
 * Every event begins and ends at zero and spends meaningful time open, which
 * removes the tonal tap/snap produced by short exponential pulse resets.
 */
function pressureBurst(time, cadence, durationSeconds, offsetSeconds = 0, peakAt = 0.2) {
  const period = 1 / cadence;
  const shifted = time + offsetSeconds;
  const phaseSeconds = ((shifted % period) + period) % period;
  if (phaseSeconds >= durationSeconds) return 0;

  const progress = phaseSeconds / durationSeconds;
  if (progress < peakAt) return smoothStep(progress / peakAt);
  return 1 - smoothStep((progress - peakAt) / (1 - peakAt));
}

function renderPack(kind) {
  const samples = new Int16Array(frames);
  const noise = randomFactory(0x1b0a5d + kind * 1907);
  let steamLowPass = 0;
  let bodyLowPass = 0;
  let windLowPass = 0;
  let wheelLowPass = 0;
  let airLowPass = 0;

  for (let index = 0; index < frames; index += 1) {
    const time = index / sampleRate;
    const rawNoise = noise();

    // Several differently damped noise bands provide steam body without making
    // a sine wave the dominant exhaust timbre.
    steamLowPass += (rawNoise - steamLowPass) * 0.045;
    bodyLowPass += (rawNoise - bodyLowPass) * 0.006;
    windLowPass += (rawNoise - windLowPass) * 0.001;
    wheelLowPass += (rawNoise - wheelLowPass) * 0.075;
    airLowPass += (rawNoise - airLowPass) * 0.13;

    const steamBand = steamLowPass - bodyLowPass;
    const airyBand = airLowPass - steamLowPass;
    const lowBody = bodyLowPass;
    let value = 0;

    if (kind === 0) {
      // Heritage road steam: compact four-beat character, open steam release,
      // and restrained joint noise. The low resonator is body, not the event.
      const exhaust = pressureBurst(time, 2.55, 0.30, 0, 0.20);
      const steam = exhaust * (
        steamBand * 0.98 +
        lowBody * 0.58 +
        airyBand * 0.045 +
        Math.sin(time * Math.PI * 2 * 72) * 0.05
      );
      const valveHiss = (0.022 + Math.sin(time * Math.PI * 2 * 0.21) * 0.012) * steamBand;
      const joint = pressureBurst(time, 1.05, 0.14, -0.08, 0.32);
      const rail = joint * (wheelLowPass * 0.07 + Math.sin(time * Math.PI * 2 * 235) * 0.014);
      value = steam * 0.80 + valveHiss + rail;
    } else if (kind === 1) {
      // Heavy articulated steam: two offset pressure releases create a broad,
      // uneven double-engine bed, followed by a diffuse low valley reflection.
      const frontEngine = pressureBurst(time, 1.50, 0.42, 0, 0.19);
      const rearEngine = pressureBurst(time, 1.50, 0.38, -0.19, 0.20);
      const front = frontEngine * (
        steamBand * 0.68 + lowBody * 1.35 + Math.sin(time * Math.PI * 2 * 46) * 0.075
      );
      const rear = rearEngine * (
        steamBand * 0.50 + lowBody * 0.92 + Math.sin(time * Math.PI * 2 * 41) * 0.048
      );
      const reflection = pressureBurst(time, 1.50, 0.58, -0.33, 0.14) *
        (lowBody * 0.72 + steamBand * 0.14);
      value = front * 0.72 + rear * 0.43 + reflection * 0.24 + windLowPass * 0.38;
    } else {
      // Winter excursion: deliberately muffled exhaust beneath a continuous
      // air bed, with a sparse, softly struck distant bell.
      const exhaust = pressureBurst(time, 2.08, 0.37, 0, 0.17);
      const mutedSteam = exhaust * (
        steamBand * 0.48 + lowBody * 0.78 + Math.sin(time * Math.PI * 2 * 58) * 0.032
      );
      const winterAir = windLowPass * 1.45 + steamBand * 0.07;
      const bellEnvelope = pressureBurst(time, 0.20, 1.45, -1.10, 0.08);
      const bell = bellEnvelope * (
        Math.sin(time * Math.PI * 2 * 705) * 0.025 +
        Math.sin(time * Math.PI * 2 * 1058) * 0.010
      );
      value = mutedSteam * 0.70 + winterAir * 0.40 + bell;
    }

    // Gentle saturation retains pressure/body but prevents isolated peaks from
    // becoming hard digital transients.
    value = Math.tanh(value * 1.15) * 0.86;

    // The sixteen-second loop makes the seam infrequent. A short smooth edge
    // fade guarantees the HTMLAudioElement wrap cannot click.
    const edgeSamples = Math.round(sampleRate * 0.12);
    const edge = Math.min(1, index / edgeSamples, (frames - index - 1) / edgeSamples);
    const seamFade = smoothStep(edge);
    samples[index] = Math.round(Math.max(-1, Math.min(1, value * seamFade)) * 32767);
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
