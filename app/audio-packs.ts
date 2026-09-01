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
    tagline: "Balanced cab atmosphere",
    detail: "Warm exhaust beats, rail joints, live steam, and the Ironbound whistle.",
    loopAsset: "/assets/audio/heritage-steam-loop.wav",
    baseVolume: 0.36,
    speedPitchRange: 0.32,
  },
  {
    id: "mountain-echo",
    name: "Mountain Echo",
    tagline: "Heavy grade-working sound",
    detail: "Deeper exhaust, long-valley reflections, harder rail joints, and station air.",
    loopAsset: "/assets/audio/mountain-echo-loop.wav",
    baseVolume: 0.34,
    speedPitchRange: 0.27,
  },
  {
    id: "winter-limited",
    name: "Winter Limited",
    tagline: "Cold, restrained running gear",
    detail: "Snow-muted exhaust, winter wind, restrained clatter, and a distant bell.",
    loopAsset: "/assets/audio/winter-limited-loop.wav",
    baseVolume: 0.30,
    speedPitchRange: 0.22,
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
  if (state.paused) return { volume: 0, playbackRate: 0.72 };
  const speed = Math.min(1, Math.max(0, state.speedMph / 70));
  const working = Math.min(1, Math.max(0, state.throttle / 100));
  const activity = Math.max(speed * 0.82, working * 0.48, state.servicing ? 0.34 : 0.05);
  return {
    volume: Math.min(0.5, pack.baseVolume * (0.22 + activity * 0.78)),
    playbackRate: 0.72 + speed * pack.speedPitchRange,
  };
}
