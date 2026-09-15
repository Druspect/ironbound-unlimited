import assert from "node:assert/strict";
import test from "node:test";

import { ENGINE_FACT_SHEETS } from "../app/engine-facts.ts";
import {
  ENGINE_AUDIO_PROFILES,
  engineAudioProfileFor,
  validateEngineAudioCoverage,
} from "../app/engine-audio-profiles.ts";

test("every engine has one explicit audio provenance profile", () => {
  assert.deepEqual(validateEngineAudioCoverage(), { missing: [], unknown: [] });
  assert.equal(Object.keys(ENGINE_AUDIO_PROFILES).length, Object.keys(ENGINE_FACT_SHEETS).length);
});

test("documented engines are labeled as analogues rather than exact recordings", () => {
  for (const [engineId, facts] of Object.entries(ENGINE_FACT_SHEETS)) {
    const profile = engineAudioProfileFor(engineId);
    assert.equal(profile.engineId, engineId);
    assert.ok(profile.beatsPerDriverRevolution >= 4);
    assert.match(profile.note, /synth|analogue|inspired/i);
    if (facts.accuracy === "documented") {
      assert.equal(profile.provenance, "class-analogue");
      assert.doesNotMatch(profile.note, /archival recording of/i);
    }
  }
});

test("articulated locomotives use articulated cadence profiles", () => {
  for (const engineId of ["nw-1218", "challenger-3985", "big-boy-4014"]) {
    const profile = engineAudioProfileFor(engineId);
    assert.equal(profile.exhaustCharacter, "articulated");
    assert.equal(profile.beatsPerDriverRevolution, 8);
    assert.equal(profile.packId, "mountain-echo");
  }
});

test("winter-limited remains explicitly tied to the 1225-inspired locomotive", () => {
  const profile = engineAudioProfileFor("polar-express-1225");
  assert.equal(profile.packId, "winter-limited");
  assert.equal(profile.provenance, "documented-inspiration");
  assert.match(profile.analogueLabel, /1225|Berkshire|winter/i);
});
