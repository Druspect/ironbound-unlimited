export type AudioPackId = "heritage-steam" | "mountain-echo" | "winter-limited";

export type AudioPack = {
  id: AudioPackId;
  name: string;
  tagline: string;
  detail: string;
  loopAsset: string;
  baseVolume: number;
  speedPitchRange: number;
};

export const AUDIO_PACKS: readonly AudioPack[] = [
  {
    id: "heritage-steam",
    name: "Heritage Steam",
    tagline: "Open road-steam pressure and rail rhythm",
    detail: "Broad steam exhaust releases, restrained rail joints, live valve hiss, and an Ironbound whistle. This is designed class-analogue audio, not an archival recording of a specific locomotive.",
    loopAsset: "/assets/audio/heritage-steam-loop.wav",
    baseVolume: 0.36,
    speedPitchRange: 0.08,
  },
  {
    id: "mountain-echo",
    name: "Mountain Echo",
    tagline: "Heavy articulated pressure and valley reflection",
    detail: "Offset heavy-steam exhaust beds, low valley reflections, and subdued mechanical noise. Articulated and freight engines use this as a class analogue, not an exact recording.",
    loopAsset: "/assets/audio/mountain-echo-loop.wav",
    baseVolume: 0.35,
    speedPitchRange: 0.06,
  },
  {
    id: "winter-limited",
    name: "Winter Limited",
    tagline: "Muffled excursion steam, winter air, distant bell",
    detail: "Snow-muted exhaust beneath moving winter air with a sparse distant bell. Mechanically inspired by Berkshire excursion service; no film or archival audio is claimed.",
    loopAsset: "/assets/audio/winter-limited-loop.wav",
    baseVolume: 0.32,
    speedPitchRange: 0.04,
  },
] as const;

export const DEFAULT_AUDIO_PACK: AudioPackId = "heritage-steam";

export function isAudioPackId(value: unknown): value is AudioPackId {
  return AUDIO_PACKS.some((pack) => pack.id === value);
}

export function audioPackFor(id: AudioPackId): AudioPack {
  return AUDIO_PACKS.find((pack) => pack.id === id) ?? AUDIO_PACKS[0];
}

export function soundscapeMix(
  packId: AudioPackId,
  state: { speedMph: number; throttle: number; paused: boolean; servicing: boolean },
) {
  const pack = audioPackFor(packId);
  if (state.paused) return { volume: 0, playbackRate: 0.96 };
  const speed = Math.min(1, Math.max(0, state.speedMph / 70));
  const working = Math.min(1, Math.max(0, state.throttle / 100));
  const activity = Math.max(speed * 0.82, working * 0.48, state.servicing ? 0.34 : 0.05);
  return {
    volume: Math.min(0.5, pack.baseVolume * (0.22 + activity * 0.78)),
    // Keep the pack's acoustic identity intact. Speed changes movement energy;
    // it no longer pitch-shifts the entire railway ambience by nearly an octave.
    playbackRate: 0.96 + speed * pack.speedPitchRange,
  };
}
