import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loops = [
  "heritage-steam-loop.wav",
  "mountain-echo-loop.wav",
  "winter-limited-loop.wav",
];

function decodePcm16(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WAVE");
  assert.equal(buffer.readUInt16LE(20), 1, "audio must remain PCM");
  assert.equal(buffer.readUInt16LE(22), 1, "audio must remain mono");
  assert.equal(buffer.readUInt16LE(34), 16, "audio must remain 16-bit");

  const sampleRate = buffer.readUInt32LE(24);
  const samples = [];
  for (let offset = 44; offset + 1 < buffer.length; offset += 2) samples.push(buffer.readInt16LE(offset));
  return { sampleRate, samples };
}

function rms(values) {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / Math.max(1, values.length));
}

function rmsEnvelope(samples, sampleRate, windowSeconds = 0.05) {
  const width = Math.max(1, Math.round(sampleRate * windowSeconds));
  const envelope = [];
  for (let offset = 0; offset + width <= samples.length; offset += width) {
    envelope.push(rms(samples.slice(offset, offset + width)));
  }
  return envelope;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

test("generated steam pressure has body instead of click-like impulses", async () => {
  for (const filename of loops) {
    const buffer = await readFile(new URL(`../public/assets/audio/${filename}`, import.meta.url));
    const { sampleRate, samples } = decodePcm16(buffer);
    let maximumDelta = 0;
    let deltaSquareSum = 0;
    let peak = 0;
    for (let index = 1; index < samples.length; index += 1) {
      const delta = samples[index] - samples[index - 1];
      maximumDelta = Math.max(maximumDelta, Math.abs(delta));
      deltaSquareSum += delta * delta;
      peak = Math.max(peak, Math.abs(samples[index]));
    }

    const signalRms = rms(samples);
    const deltaRms = Math.sqrt(deltaSquareSum / Math.max(1, samples.length - 1));
    const envelope = rmsEnvelope(samples, sampleRate, 0.02);
    const sortedEnvelope = [...envelope].sort((a, b) => a - b);
    const medianEnvelope = sortedEnvelope[Math.floor(sortedEnvelope.length / 2)];
    const envelopeCrest = Math.max(...envelope) / Math.max(1, medianEnvelope);

    assert.ok(maximumDelta < 2_200, `${filename} has a snap-like adjacent-sample jump of ${maximumDelta}`);
    assert.ok(deltaRms / signalRms < 0.38, `${filename} contains too much impulse/high-frequency motion`);
    assert.ok(peak / signalRms < 8.5, `${filename} is dominated by narrow transient peaks`);
    assert.ok(envelopeCrest < 6, `${filename} exhaust events are too narrow to read as pressure releases`);
  }
});

test("generated loop seams remain quiet without silencing the railway body", async () => {
  for (const filename of loops) {
    const buffer = await readFile(new URL(`../public/assets/audio/${filename}`, import.meta.url));
    const { samples } = decodePcm16(buffer);
    const edge = [...samples.slice(0, 128), ...samples.slice(-128)];
    const edgePeak = edge.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0);
    const meanAbsolute = mean(samples.map((sample) => Math.abs(sample)));

    assert.ok(edgePeak < 300, `${filename} loop seam peak is too abrupt: ${edgePeak}`);
    assert.ok(meanAbsolute > 450, `${filename} became too quiet to function as a railway soundscape`);
  }
});

test("the three packs have measurably different acoustic envelopes, not just different file hashes", async () => {
  const envelopes = [];
  for (const filename of loops) {
    const buffer = await readFile(new URL(`../public/assets/audio/${filename}`, import.meta.url));
    const { sampleRate, samples } = decodePcm16(buffer);
    const envelope = rmsEnvelope(samples, sampleRate, 0.05);
    const average = mean(envelope);
    envelopes.push(envelope.map((value) => value / Math.max(1, average)));
  }

  for (let left = 0; left < envelopes.length; left += 1) {
    for (let right = left + 1; right < envelopes.length; right += 1) {
      const count = Math.min(envelopes[left].length, envelopes[right].length);
      let difference = 0;
      for (let index = 0; index < count; index += 1) {
        difference += Math.abs(envelopes[left][index] - envelopes[right][index]);
      }
      difference /= count;
      assert.ok(difference > 0.30, `${loops[left]} and ${loops[right]} still share the same loudness/cadence identity (${difference.toFixed(3)})`);
    }
  }
});

test("generator uses finite smooth pressure bursts rather than exponential pulse resets", async () => {
  const generator = await readFile(new URL("../scripts/generate-audio-packs.mjs", import.meta.url), "utf8");
  assert.match(generator, /function pressureBurst/);
  assert.match(generator, /if \(phaseSeconds >= durationSeconds\) return 0/);
  assert.doesNotMatch(generator, /function eventEnvelope|1 - Math\.exp\(-phaseSeconds/);
});

test("production build regenerates deterministic audio before bundling", async () => {
  const buildScript = await readFile(new URL("../scripts/build-verified.sh", import.meta.url), "utf8");
  assert.match(buildScript, /node\s+"\$\{script_dir\}\/generate-audio-packs\.mjs"/);
});
