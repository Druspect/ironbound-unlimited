import type { ExhaustMotion } from "./locomotive-exhaust.ts";
import type { EngineAudioProfile } from "./engine-audio-profiles.ts";

export type ExhaustAudioState = {
  previousTravel: number | null;
  beats: number;
};

export const EXHAUST_ONE_SHOT_ASSETS = Object.freeze({
  light: "/assets/audio/exhaust-light.wav",
  balanced: "/assets/audio/exhaust-balanced.wav",
  heavy: "/assets/audio/exhaust-heavy.wav",
  articulated: "/assets/audio/exhaust-articulated.wav",
} as const);

export const createExhaustAudioState = (): ExhaustAudioState => ({
  previousTravel: null,
  beats: 0,
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Convert accumulated rail travel into discrete cylinder-exhaust events.
 * Cadence comes only from driver circumference and the registered engine beat
 * count. Throttle affects the strength of each event, never the event timing.
 */
export function stepExhaustAudio(
  state: ExhaustAudioState,
  motion: ExhaustMotion,
  beatsPerDriverRevolution: number,
) {
  const currentTravel = Number.isFinite(motion.travel) ? motion.travel : 0;
  const previousTravel = state.previousTravel;
  state.previousTravel = currentTravel;

  if (previousTravel === null) return 0;
  if (motion.paused || motion.speed <= 1 || motion.load <= 0.01) {
    state.beats = 0;
    return 0;
  }

  const deltaTravel = Math.max(0, currentTravel - previousTravel);
  const circumference = 2 * Math.PI * Math.max(1, motion.driverRadius);
  state.beats += deltaTravel / circumference * Math.max(1, beatsPerDriverRevolution);

  let events = Math.floor(state.beats);
  state.beats -= events;

  // A suspended browser tab or a long rendering stall must never produce a
  // machine-gun catch-up burst. Normal 30–60 fps motion stays below this cap.
  events = Math.min(2, events);
  return events;
}

export function exhaustOneShotAsset(profile: Pick<EngineAudioProfile, "exhaustCharacter">) {
  return EXHAUST_ONE_SHOT_ASSETS[profile.exhaustCharacter];
}

export function exhaustBeatGain(
  profile: Pick<EngineAudioProfile, "exhaustCharacter">,
  motion: Pick<ExhaustMotion, "load" | "speed">,
) {
  const characterGain = {
    light: 0.58,
    balanced: 0.68,
    heavy: 0.78,
    articulated: 0.82,
  }[profile.exhaustCharacter];
  const work = 0.24 + Math.sqrt(clamp(motion.load, 0, 1)) * 0.76;
  const motionPresence = 0.72 + clamp(motion.speed / 55, 0, 1) * 0.28;
  return clamp(characterGain * work * motionPresence, 0.08, 0.94);
}
