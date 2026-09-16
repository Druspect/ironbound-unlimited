import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("runtime carries effective brake-cylinder pressure between animation frames", () => {
  assert.match(pageSource, /const brakeCylinderPressureRef = useRef\(0\)/,
    "page runtime needs a persistent brake-cylinder pressure ref");
  assert.match(pageSource, /brakeCylinderPressure: brakeCylinderPressureRef\.current/,
    "advanceLocomotive input must receive the previous frame's cylinder pressure");
  assert.match(pageSource, /brakeCylinderPressureRef\.current = next\.brakeCylinderPressure \?\? 0/,
    "runtime must retain the newly propagated cylinder pressure for the next frame");
});

test("run restart resets both engineer brake pressure and effective cylinder pressure", () => {
  assert.match(pageSource, /brakePressureRef\.current = 1;[\s\S]*brakeCylinderPressureRef\.current = 1;/,
    "restart must initialize the fully-set train brake consistently");
});
