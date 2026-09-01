import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import { LOCOMOTIVES } from "../app/locomotive-catalog.ts";

const originRoot = new URL("../references/gfx-origin/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", originRoot), "utf8"));

function webpDimensions(bytes) {
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  if (chunk === "VP8 ") return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") return { width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8), height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10) };
  throw new Error(`Unsupported WebP chunk ${chunk}`);
}

function jpegDimensions(bytes) {
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  let offset = 2;
  while (offset < bytes.length - 9) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  throw new Error("JPEG dimensions not found");
}

test("the reference manifest covers every engine and exactly five carriage archetypes", () => {
  assert.equal(manifest.policy.startsWith("reference-only"), true);
  assert.deepEqual(manifest.engines.map(({ id }) => id).sort(), LOCOMOTIVES.map(({ id }) => id).sort());
  assert.equal(manifest.carriages.length, 5);
  assert.equal(new Set(manifest.carriages.map(({ id }) => id)).size, 5);
  assert.deepEqual(manifest.engines.filter(({ status }) => status === "fictional-proxy").map(({ id }) => id).sort(), ["the-flyer-1907", "tom-thumb"]);
});

test("every origin image is local, inspectable, high-resolution enough, and source-traceable", async () => {
  for (const entry of [...manifest.engines, ...manifest.carriages]) {
    assert.match(entry.source, /^https:\/\//);
    assert.doesNotMatch(entry.file, /^\/|\.\./);
    const url = new URL(entry.file, originRoot);
    const info = await stat(url);
    assert.ok(info.size >= 25_000, `${entry.id} is only ${info.size} bytes`);
    const bytes = await readFile(url);
    const dimensions = entry.file.endsWith(".webp") ? webpDimensions(bytes) : jpegDimensions(bytes);
    assert.ok(dimensions.width >= 600, `${entry.id} width ${dimensions.width}`);
    assert.ok(dimensions.height >= 400, `${entry.id} height ${dimensions.height}`);
  }
});

test("reference photographs never leak into the public shipping tree", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  for (const entry of [...manifest.engines, ...manifest.carriages]) {
    assert.doesNotMatch(page, new RegExp(entry.file.split("/").at(-1).replaceAll(".", "\\.")));
  }
});

test("shipping carriage bodies share one alpha-safe production canvas", async () => {
  for (const name of ["day-coach", "pullman-sleeper", "baggage-mail", "dining-car", "observation-car"]) {
    const url = new URL(`../public/assets/carriages/v1/${name}.webp`, import.meta.url);
    const bytes = await readFile(url);
    const info = await stat(url);
    assert.deepEqual(webpDimensions(bytes), { width: 900, height: 348 }, name);
    assert.ok(info.size >= 25_000 && info.size <= 100_000, `${name} optimized size ${info.size}`);
    assert.equal(bytes.toString("ascii", 12, 16), "VP8X", `${name} extended WebP`);
    assert.ok((bytes[20] & 0x10) !== 0, `${name} declares alpha`);
  }
});
