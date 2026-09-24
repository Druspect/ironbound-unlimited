export type RouteBiomeId =
  | "high-plains"
  | "red-mesa"
  | "salt-flats"
  | "pine-divide"
  | "alpine-pass"
  | "river-basin";

export type RouteBiomeTheme = {
  sky: readonly [number, number, number];
  ground: readonly [number, number, number];
  haze: readonly [number, number, number];
  scrubHue: number;
  scrubSaturation: number;
  scrubBrightness: number;
};

export type RouteBiome = {
  id: RouteBiomeId;
  name: string;
  short: string;
  asset: string;
  character: string;
  theme: RouteBiomeTheme;
};

export const ROUTE_TILES_PER_BIOME = 5;

export const ROUTE_BIOMES: readonly RouteBiome[] = Object.freeze([
  { id: "high-plains", name: "High Plains", short: "PLAINS", asset: "/assets/high-plains.webp", character: "open ranch country and long sight lines", theme: { sky: [186, 154, 119], ground: [95, 78, 56], haze: [212, 181, 137], scrubHue: 15, scrubSaturation: .86, scrubBrightness: .94 } },
  { id: "red-mesa", name: "Red Mesa", short: "MESA", asset: "/assets/red-mesa.webp", character: "cut rock, dry washes, and exposed grades", theme: { sky: [181, 126, 105], ground: [105, 62, 48], haze: [205, 137, 109], scrubHue: -9, scrubSaturation: .82, scrubBrightness: .88 } },
  { id: "salt-flats", name: "Salt Flats", short: "SALT", asset: "/assets/salt-flats-v1.webp", character: "bright open works and descending main line", theme: { sky: [204, 195, 169], ground: [129, 122, 103], haze: [235, 220, 182], scrubHue: 22, scrubSaturation: .54, scrubBrightness: 1.08 } },
  { id: "pine-divide", name: "Pine Divide", short: "PINES", asset: "/assets/pine-divide.webp", character: "timber country and climbing mountain railroad", theme: { sky: [118, 139, 139], ground: [43, 67, 55], haze: [137, 163, 152], scrubHue: 38, scrubSaturation: 1.14, scrubBrightness: .76 } },
  { id: "alpine-pass", name: "Alpine Pass", short: "ALPINE", asset: "/assets/alpine-pass-v1.webp", character: "high exposed summit territory", theme: { sky: [139, 158, 174], ground: [66, 75, 78], haze: [190, 206, 214], scrubHue: 62, scrubSaturation: .58, scrubBrightness: .88 } },
  { id: "river-basin", name: "River Basin", short: "RIVER", asset: "/assets/river-basin.webp", character: "waterfront lowlands and the terminal approach", theme: { sky: [115, 145, 151], ground: [42, 72, 68], haze: [143, 177, 177], scrubHue: 48, scrubSaturation: 1.04, scrubBrightness: .82 } },
]);

export type RouteLandmarkKind =
  | "windmill"
  | "cattle-pen"
  | "mesa-spire"
  | "water-tower"
  | "salt-racks"
  | "signal-box"
  | "pine-grove"
  | "timber-stack"
  | "snow-shed"
  | "river-bridge";

export type RouteLandmark = {
  id: string;
  biome: RouteBiomeId;
  tile: number;
  leftPercent: number;
  scale: number;
  depth: "far" | "mid";
  kind: RouteLandmarkKind;
};

export const ROUTE_LANDMARKS: readonly RouteLandmark[] = Object.freeze([
  { id: "plains-windmill", biome: "high-plains", tile: 1, leftPercent: 72, scale: .82, depth: "far", kind: "windmill" },
  { id: "plains-cattle-pen", biome: "high-plains", tile: 3, leftPercent: 62, scale: .92, depth: "mid", kind: "cattle-pen" },

  { id: "mesa-east-spire", biome: "red-mesa", tile: 1, leftPercent: 70, scale: 1.05, depth: "far", kind: "mesa-spire" },
  { id: "mesa-water-tower", biome: "red-mesa", tile: 3, leftPercent: 66, scale: .86, depth: "mid", kind: "water-tower" },

  { id: "salt-evaporation-racks", biome: "salt-flats", tile: 1, leftPercent: 68, scale: 1, depth: "mid", kind: "salt-racks" },
  { id: "salt-section-box", biome: "salt-flats", tile: 3, leftPercent: 76, scale: .82, depth: "mid", kind: "signal-box" },

  { id: "pine-grove-west", biome: "pine-divide", tile: 1, leftPercent: 64, scale: 1.06, depth: "mid", kind: "pine-grove" },
  { id: "pine-timber-stack", biome: "pine-divide", tile: 3, leftPercent: 70, scale: .92, depth: "mid", kind: "timber-stack" },

  { id: "alpine-snow-shed", biome: "alpine-pass", tile: 1, leftPercent: 61, scale: 1.02, depth: "mid", kind: "snow-shed" },
  { id: "alpine-summit-signal", biome: "alpine-pass", tile: 3, leftPercent: 76, scale: .78, depth: "mid", kind: "signal-box" },

  { id: "river-bridge-approach", biome: "river-basin", tile: 1, leftPercent: 61, scale: 1.08, depth: "mid", kind: "river-bridge" },
  { id: "river-terminal-tank", biome: "river-basin", tile: 3, leftPercent: 74, scale: .9, depth: "mid", kind: "water-tower" },
]);

export function landmarksForRouteTile(biomeIndex: number, tile: number) {
  const biome = ROUTE_BIOMES[biomeIndex];
  if (!biome) return [];
  return ROUTE_LANDMARKS.filter((landmark) => landmark.biome === biome.id && landmark.tile === tile);
}


export type StationContent = {
  stationId: string;
  district: string;
  approachCue: string;
  identity: string;
  role: "local" | "water" | "industry" | "division" | "summit" | "terminal";
  terminal: boolean;
};

export const ROUTE_STATION_CONTENT: Readonly<Record<string, StationContent>> = Object.freeze({
  "cinder-flats": { stationId: "cinder-flats", district: "High Plains", approachCue: "Windmill and stock pens", identity: "Ranch-country flag stop", role: "local", terminal: false },
  "copper-wash": { stationId: "copper-wash", district: "Red Mesa", approachCue: "Water tank below the cut", identity: "Desert water stop", role: "water", terminal: false },
  "saltworks": { stationId: "saltworks", district: "Salt Flats", approachCue: "Evaporation racks and section box", identity: "Salt and mail siding", role: "industry", terminal: false },
  "timberline": { stationId: "timberline", district: "Pine Divide", approachCue: "Timber stacks at the service track", identity: "Mountain division point", role: "division", terminal: false },
  "summit-house": { stationId: "summit-house", district: "Alpine Pass", approachCue: "Snow shed beyond the summit signal", identity: "High-country water stop", role: "summit", terminal: false },
  "stillwater": { stationId: "stillwater", district: "River Basin", approachCue: "Bridge approach and terminal tank", identity: "Westbound terminal", role: "terminal", terminal: true },
});

const lerp = (a: number, b: number, mix: number) => a + (b - a) * Math.max(0, Math.min(1, mix));
const blendRgb = (a: readonly number[], b: readonly number[], mix: number) =>
  `rgb(${Math.round(lerp(a[0], b[0], mix))} ${Math.round(lerp(a[1], b[1], mix))} ${Math.round(lerp(a[2], b[2], mix))})`;

export function blendBiomeTheme(currentIndex: number, nextIndex: number, mix: number) {
  const current = ROUTE_BIOMES[currentIndex] ?? ROUTE_BIOMES[0];
  const next = ROUTE_BIOMES[nextIndex] ?? current;
  const clampedMix = Math.max(0, Math.min(1, mix));
  return {
    sky: blendRgb(current.theme.sky, next.theme.sky, clampedMix),
    ground: blendRgb(current.theme.ground, next.theme.ground, clampedMix),
    haze: blendRgb(current.theme.haze, next.theme.haze, clampedMix),
    scrubHue: lerp(current.theme.scrubHue, next.theme.scrubHue, clampedMix),
    scrubSaturation: lerp(current.theme.scrubSaturation, next.theme.scrubSaturation, clampedMix),
    scrubBrightness: lerp(current.theme.scrubBrightness, next.theme.scrubBrightness, clampedMix),
  };
}

export function stationContentFor(stationId: string) {
  return ROUTE_STATION_CONTENT[stationId] ?? {
    stationId,
    district: "Ironbound Railway",
    approachCue: "Scheduled stop ahead",
    identity: "Railway stop",
    role: "local" as const,
    terminal: false,
  };
}
