import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

const qaKeys = ["qaSuite", "qaEngine", "qaCars", "qaStation", "qaService", "qaFailure"];

test("every internal browser fixture query is stripped before production hydration", () => {
  for (const key of qaKeys) assert.match(layout, new RegExp(`"${key}"`));
  assert.match(layout, /process\.env\.NODE_ENV\s*===\s*"production"/);
  assert.match(layout, /<script\s+dangerouslySetInnerHTML=/);
  assert.match(layout, /history\.replaceState/);
});

test("production guard only removes QA parameters and preserves the rest of the URL", () => {
  assert.match(layout, /url\.searchParams\.delete\(key\)/);
  assert.match(layout, /url\.pathname\s*\+\s*url\.search\s*\+\s*url\.hash/);
  assert.doesNotMatch(layout, /location\.replace|location\.reload/);
});
