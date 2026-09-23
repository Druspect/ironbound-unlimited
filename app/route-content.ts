export type RouteBiomeId =
  | "high-plains"
  | "red-mesa"
  | "salt-flats"
  | "pine-divide"
  | "alpine-pass"
  | "river-basin";

export type RouteBiome = {
  id: RouteBiomeId;
  name: string;
  short: string;
  asset: string;
  character: string;
};

export const ROUTE_TILES_PER_BIOME = 5;

export const ROUTE_BIOMES: readonly RouteBiome[] = Object.freeze([
  { id: "high-plains", name: "High Plains", short: "PLAINS", asset: "/assets/high-plains.webp", character: "open ranch country and long sight lines" },
  { id: "red-mesa", name: "Red Mesa", short: "MESA", asset: "/assets/red-mesa.webp", character: "cut rock, dry washes, and exposed grades" },
  { id: "salt-flats", name: "Salt Flats", short: "SALT", asset: "/assets/salt-flats-v1.webp", character: "bright open works and descending main line" },
  { id: "pine-divide", name: "Pine Divide", short: "PINES", asset: "/assets/pine-divide.webp", character: "timber country and climbing mountain railroad" },
  { id: "alpine-pass", name: "Alpine Pass", short: "ALPINE", asset: "/assets/alpine-pass-v1.webp", character: "high exposed summit territory" },
  { id: "river-basin", name: "River Basin", short: "RIVER", asset: "/assets/river-basin.webp", character: "waterfront lowlands and the terminal approach" },
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
