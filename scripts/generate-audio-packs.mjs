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

    value = Math.tanh(value * 1.15) * 0.86;
    const edgeSamples = Math.round(sampleRate * 0.12);
    const edge = Math.min(1, index / edgeSamples, (frames - index - 1) / edgeSamples);
    const seamFade = smoothStep(edge);
    samples[index] = Math.round(Math.max(-1, Math.min(1, value * seamFade)) * 32767);
  }
  return samples;
}

function shotEnvelope(progress, peakAt, tailShape = 1.35) {
  if (progress <= 0 || progress >= 1) return 0;
  if (progress < peakAt) return smoothStep(progress / peakAt);
  const release = 1 - smoothStep((progress - peakAt) / (1 - peakAt));
  return Math.pow(release, tailShape);
}

function renderExhaustShot(kind) {
  const specs = [
    { duration: 0.34, peak: 0.14, steam: 1.00, body: 0.40, air: 0.24, tone: 86, toneGain: 0.035, seed: 1907 },
    { duration: 0.41, peak: 0.16, steam: 0.92, body: 0.66, air: 0.20, tone: 68, toneGain: 0.045, seed: 1361 },
    { duration: 0.52, peak: 0.18, steam: 0.80, body: 1.00, air: 0.15, tone: 50, toneGain: 0.060, seed: 765 },
    { duration: 0.46, peak: 0.17, steam: 0.74, body: 1.16, air: 0.12, tone: 43, toneGain: 0.068, seed: 4014 },
  ][kind];
  const frameCount = Math.round(sampleRate * specs.duration);
  const floating = new Float64Array(frameCount);
  const noise = randomFactory(0x455848 + specs.seed);
  let steamLow = 0;
  let bodyLow = 0;
  let airHigh = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / sampleRate;
    const progress = index / Math.max(1, frameCount - 1);
    const raw = noise();
    steamLow += (raw - steamLow) * 0.055;
    bodyLow += (raw - bodyLow) * 0.008;
    airHigh += (raw - airHigh) * 0.20;
    const steamBand = steamLow - bodyLow;
    const airBand = airHigh - steamLow;
    const envelope = shotEnvelope(progress, specs.peak, kind >= 2 ? 1.10 : 1.35);
    const pressureBody =
      steamBand * specs.steam +
      bodyLow * specs.body +
      airBand * specs.air +
      Math.sin(Math.PI * 2 * specs.tone * time) * specs.toneGain;
    const valveBreath = Math.sin(Math.PI * progress) ** 2 * steamBand * 0.16;
    floating[index] = Math.tanh((pressureBody * envelope + valveBreath) * 1.35);
  }

  return normalizeToPcm(floating, 0.80);
}

function renderWhistle() {
  const duration = 2.45;
  const frameCount = Math.round(sampleRate * duration);
  const samples = new Float64Array(frameCount);
  const noise = randomFactory(4501);
  const frequencies = [293.66, 369.99, 440.0, 587.33];
  const phases = frequencies.map(() => (noise() * 0.5 + 0.5) * Math.PI * 2);
  let steamSlow = 0;
  let steamFast = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / sampleRate;
    const attack = Math.min(1, time / 0.075);
    const release = Math.min(1, Math.max(0, (duration - time) / 0.62));
    const pressure = Math.sin(attack * Math.PI / 2) ** 2 * Math.sin(release * Math.PI / 2) ** 2 *
      (0.96 + 0.035 * Math.sin(Math.PI * 2 * 2.7 * time));
    const pitchRise = 0.978 + 0.022 * Math.min(1, time / 0.32);
    let chimes = 0;
    for (let chime = 0; chime < frequencies.length; chime += 1) {
      const vibrato = 1 + 0.0018 * Math.sin(Math.PI * 2 * (3.5 + chime * 0.19) * time + phases[chime]);
      const angle = Math.PI * 2 * frequencies[chime] * pitchRise * vibrato * time + phases[chime];
      chimes += (Math.sin(angle) + 0.24 * Math.sin(2 * angle + 0.31) + 0.09 * Math.sin(3 * angle + 0.7)) /
        (1 + chime * 0.16);
    }

    const raw = noise();
    steamSlow += 0.012 * (raw - steamSlow);
    steamFast += 0.18 * (raw - steamFast);
    const air = steamFast - steamSlow;
    const valveCrack = Math.exp(-time * 19) + 0.28 * Math.exp(-Math.max(0, duration - time) * 8);
    samples[index] = pressure * (0.155 * chimes + (0.07 + 0.12 * valveCrack) * air);
  }

  const dry = samples.slice();
  for (const [delaySeconds, gain] of [[0.087, 0.18], [0.173, 0.11], [0.307, 0.055]]) {
    const delay = Math.round(delaySeconds * sampleRate);
    for (let index = delay; index < frameCount; index += 1) samples[index] += dry[index - delay] * gain;
  }

  return normalizeToPcm(samples, 0.86);
}

function normalizeToPcm(samples, targetPeak) {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const scale = peak > 0 ? targetPeak / peak : 1;
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    pcm[index] = Math.round(Math.max(-1, Math.min(1, samples[index] * scale)) * 32767);
  }
  return pcm;
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

for (const [index, filename] of ["exhaust-light.wav", "exhaust-balanced.wav", "exhaust-heavy.wav", "exhaust-articulated.wav"].entries()) {
  await writeFile(resolve(output, filename), wavBuffer(renderExhaustShot(index)));
}

await writeFile(resolve(output, "ironbound-steam-whistle.wav"), wavBuffer(renderWhistle()));
