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

  const samples = [];
  for (let offset = 44; offset + 1 < buffer.length; offset += 2) samples.push(buffer.readInt16LE(offset));
  return samples;
}

test("generated steam loops avoid click-like sample discontinuities", async () => {
  for (const filename of loops) {
    const buffer = await readFile(new URL(`../public/assets/audio/${filename}`, import.meta.url));
    const samples = decodePcm16(buffer);
    const deltas = samples.slice(1).map((sample, index) => Math.abs(sample - samples[index]));
    const maximumDelta = Math.max(...deltas);
    assert.ok(maximumDelta < 2_500, `${filename} has a click-like adjacent-sample jump of ${maximumDelta}`);
  }
});

test("generated loop seams fade smoothly without silencing the useful signal", async () => {
  for (const filename of loops) {
    const buffer = await readFile(new URL(`../public/assets/audio/${filename}`, import.meta.url));
    const samples = decodePcm16(buffer);
    const edge = [...samples.slice(0, 128), ...samples.slice(-128)];
    const edgePeak = Math.max(...edge.map(Math.abs));
    const meanAbsolute = samples.reduce((sum, sample) => sum + Math.abs(sample), 0) / samples.length;

    assert.ok(edgePeak < 300, `${filename} loop seam peak is too abrupt: ${edgePeak}`);
    assert.ok(meanAbsolute > 600, `${filename} became too quiet to function as a railway soundscape`);
  }
});

test("production build regenerates deterministic audio before bundling", async () => {
  const buildScript = await readFile(new URL("../scripts/build-verified.sh", import.meta.url), "utf8");
  assert.match(buildScript, /node\s+"\$\{script_dir\}\/generate-audio-packs\.mjs"/);
});
