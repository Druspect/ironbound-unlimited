import assert from "node:assert/strict";
import test from "node:test";

import { RELEASE_INFO, releaseDisplayLabel } from "../app/release-info.ts";

test("Stage G release metadata remains explicit and separate from gameplay", () => {
  assert.equal(RELEASE_INFO.stage, "G");
  assert.equal(RELEASE_INFO.saveSchema, 4);
  assert.match(RELEASE_INFO.buildId, /^stage-g-/);
  assert.match(releaseDisplayLabel(), /Stage G/);
  assert.equal(RELEASE_INFO.version, "1.0.0");
  assert.equal(RELEASE_INFO.label, "Production Release");
  assert.match(releaseDisplayLabel(), /Production Release/);
});
