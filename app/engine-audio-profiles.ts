import type { AudioPackId } from "./audio-packs.ts";
import { ENGINE_FACT_SHEETS } from "./engine-facts.ts";

export type EngineAudioProvenance = "class-analogue" | "fictional-design" | "documented-inspiration";

export type EngineAudioProfile = {
  engineId: string;
  packId: AudioPackId;
  provenance: EngineAudioProvenance;
  displayLabel: string;
  analogueLabel: string;
  exhaustCharacter: "light" | "balanced" | "heavy" | "articulated";
  whistleCharacter: "early-passenger" | "freight" | "high-speed-passenger" | "articulated-freight" | "winter-excursion";
  beatsPerDriverRevolution: number;
  note: string;
};

/**
 * Audio in the current web build is synthesized. These registrations make the
 * provenance explicit and bind each locomotive to a class analogue instead of
 * implying that a generic loop is an archival recording of that exact engine.
 */
export const ENGINE_AUDIO_PROFILES: Readonly<Record<string, EngineAudioProfile>> = Object.freeze({
  "tom-thumb": {
    engineId: "tom-thumb",
    packId: "heritage-steam",
    provenance: "fictional-design",
    displayLabel: "Ironbound No. 1 design sound",
    analogueLabel: "early 20th-century two-cylinder 4-6-0",
    exhaustCharacter: "light",
    whistleCharacter: "early-passenger",
    beatsPerDriverRevolution: 4,
    note: "Synthesized design target for the fictional starter locomotive.",
  },
  "southern-4501": {
    engineId: "southern-4501",
    packId: "mountain-echo",
    provenance: "class-analogue",
    displayLabel: "Ms Mikado class analogue",
    analogueLabel: "two-cylinder 2-8-2 freight Mikado",
    exhaustCharacter: "heavy",
    whistleCharacter: "freight",
    beatsPerDriverRevolution: 4,
    note: "Class-analogue synthesis; not represented as a recording of No. 4501.",
  },
  "prr-1361": {
    engineId: "prr-1361",
    packId: "heritage-steam",
    provenance: "class-analogue",
    displayLabel: "K4s Pacific class analogue",
    analogueLabel: "two-cylinder 4-6-2 passenger Pacific",
    exhaustCharacter: "balanced",
    whistleCharacter: "high-speed-passenger",
    beatsPerDriverRevolution: 4,
    note: "Class-analogue synthesis; not represented as a recording of No. 1361.",
  },
  "nkp-765": {
    engineId: "nkp-765",
    packId: "mountain-echo",
    provenance: "class-analogue",
    displayLabel: "S-2 Berkshire class analogue",
    analogueLabel: "two-cylinder 2-8-4 Berkshire",
    exhaustCharacter: "heavy",
    whistleCharacter: "freight",
    beatsPerDriverRevolution: 4,
    note: "Class-analogue synthesis; not represented as a recording of No. 765.",
  },
  "atsf-3751": {
    engineId: "atsf-3751",
    packId: "heritage-steam",
    provenance: "class-analogue",
    displayLabel: "3751 Northern class analogue",
    analogueLabel: "two-cylinder oil-burning 4-8-4 passenger Northern",
    exhaustCharacter: "balanced",
    whistleCharacter: "high-speed-passenger",
    beatsPerDriverRevolution: 4,
    note: "Class-analogue synthesis; not represented as a recording of No. 3751.",
  },
  "nw-611": {
    engineId: "nw-611",
    packId: "heritage-steam",
    provenance: "class-analogue",
    displayLabel: "N&W J class analogue",
    analogueLabel: "two-cylinder high-speed 4-8-4 passenger cadence",
    exhaustCharacter: "balanced",
    whistleCharacter: "high-speed-passenger",
    beatsPerDriverRevolution: 4,
    note: "Two-cylinder class-analogue cadence; not represented as an archival No. 611 recording.",
  },
  "up-844": {
    engineId: "up-844",
    packId: "heritage-steam",
    provenance: "class-analogue",
    displayLabel: "FEF-3 Northern class analogue",
    analogueLabel: "two-cylinder oil-burning 4-8-4 passenger Northern",
    exhaustCharacter: "balanced",
    whistleCharacter: "high-speed-passenger",
    beatsPerDriverRevolution: 4,
    note: "Class-analogue synthesis; not represented as a recording of No. 844.",
  },
  "nw-1218": {
    engineId: "nw-1218",
    packId: "mountain-echo",
    provenance: "class-analogue",
    displayLabel: "N&W A articulated class analogue",
    analogueLabel: "simple articulated 2-6-6-4 freight cadence",
    exhaustCharacter: "articulated",
    whistleCharacter: "articulated-freight",
    beatsPerDriverRevolution: 8,
    note: "Articulated class-analogue synthesis; not represented as a recording of No. 1218.",
  },
  "challenger-3985": {
    engineId: "challenger-3985",
    packId: "mountain-echo",
    provenance: "class-analogue",
    displayLabel: "Challenger class analogue",
    analogueLabel: "simple articulated 4-6-6-4 mixed-traffic cadence",
    exhaustCharacter: "articulated",
    whistleCharacter: "articulated-freight",
    beatsPerDriverRevolution: 8,
    note: "Articulated class-analogue synthesis; not represented as a recording of No. 3985.",
  },
  "big-boy-4014": {
    engineId: "big-boy-4014",
    packId: "mountain-echo",
    provenance: "class-analogue",
    displayLabel: "Big Boy class analogue",
    analogueLabel: "simple articulated 4-8-8-4 heavy-freight cadence",
    exhaustCharacter: "articulated",
    whistleCharacter: "articulated-freight",
    beatsPerDriverRevolution: 8,
    note: "Articulated class-analogue synthesis; not represented as a recording of No. 4014.",
  },
  "the-flyer-1907": {
    engineId: "the-flyer-1907",
    packId: "heritage-steam",
    provenance: "fictional-design",
    displayLabel: "1907 Atlantic design sound",
    analogueLabel: "high-driver two-cylinder 4-4-2 passenger Atlantic",
    exhaustCharacter: "light",
    whistleCharacter: "early-passenger",
    beatsPerDriverRevolution: 4,
    note: "Synthesized design target for the fictional heritage locomotive.",
  },
  "polar-express-1225": {
    engineId: "polar-express-1225",
    packId: "winter-limited",
    provenance: "documented-inspiration",
    displayLabel: "Pere Marquette 1225 class analogue",
    analogueLabel: "two-cylinder 2-8-4 Berkshire winter-excursion cadence",
    exhaustCharacter: "heavy",
    whistleCharacter: "winter-excursion",
    beatsPerDriverRevolution: 4,
    note: "Mechanically inspired by Pere Marquette 1225; no film audio or archival recording is claimed.",
  },
});

export function engineAudioProfileFor(engineId: string): EngineAudioProfile {
  const profile = ENGINE_AUDIO_PROFILES[engineId];
  if (!profile) throw new Error(`No audio provenance profile registered for ${engineId}`);
  return profile;
}

export function validateEngineAudioCoverage() {
  const engineIds = Object.keys(ENGINE_FACT_SHEETS).sort();
  const audioIds = Object.keys(ENGINE_AUDIO_PROFILES).sort();
  return {
    missing: engineIds.filter((id) => !audioIds.includes(id)),
    unknown: audioIds.filter((id) => !engineIds.includes(id)),
  };
}
