import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const control = readFileSync(new URL("../app/carriage-livery-control.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/carriage-liveries.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

const expected = [
  "pullman-green",
  "tuscan-red",
  "coach-brown",
  "midnight-blue",
  "oxide-red",
  "silver-gray",
];

test("carriage palette provides six coherent non-bitmap liveries", () => {
  for (const id of expected) {
    assert.match(control, new RegExp(`id: "${id}"`));
    assert.match(css, new RegExp(`data-carriage-livery="${id}"`));
  }
  assert.equal((control.match(/id: "/g) ?? []).length, expected.length);
  assert.match(control, /DEFAULT_LIVERY: CarriageLiveryId = "pullman-green"/);
  assert.ok(expected.some((id) => id !== "pullman-green"));
});

test("one selected livery colors both running consist and store previews", () => {
  assert.match(css, /\.passenger-body,\s*\n\.consist-car-preview img/);
  assert.match(css, /--carriage-livery-filter/);
  assert.match(css, /train-wrap\.is-servicing \.passenger-body/);
});

test("livery selection persists independently without mutating carriage identity", () => {
  assert.match(control, /ironbound-carriage-livery/);
  assert.match(control, /localStorage\.setItem\(STORAGE_KEY, next\)/);
  assert.doesNotMatch(control, /consistCars|carTypeFor|loadedTons|emptyTons/);
});

test("livery control is loaded globally but shown only in carriage store", () => {
  assert.match(layout, /<CarriageLiveryControl \/>/);
  assert.match(layout, /import "\.\/carriage-liveries\.css"/);
  assert.match(css, /body:has\(#carriage-store-heading\) \.carriage-livery-control/);
});


test("default Pullman green stays dark and restrained", () => {
  const match = css.match(/data-carriage-livery="pullman-green"\][\s\S]*?--carriage-livery-filter:\s*([^;]+);/);
  assert.ok(match, "Pullman Green filter must remain explicit");
  assert.match(match[1], /brightness\(\.60\)/);
  assert.match(match[1], /saturate\(1\.58\)/);
  assert.match(css, /--carriage-livery-swatch:\s*#29372d/);
});
