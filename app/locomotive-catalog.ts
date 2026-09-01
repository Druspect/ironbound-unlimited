import registration from "./locomotive-registration.json" with { type: "json" };

export const LOCOMOTIVE_SPRITE_CANVAS = registration.canvas;
export const LOCOMOTIVE_SPRITE_ANIMATION = registration.animation;
export const LOCOMOTIVE_ART_REVISION = registration.art_revision;
export const LOCOMOTIVE_SPRITE_RAIL_INSET = (registration.canvas.height - registration.rail_y) / registration.canvas.height * 100;

export type Locomotive = {
  id: string;
  name: string;
  road: string;
  wheelArrangement: string;
  cost: number;
  bondMultiplier: number;
  tier: string;
  atlas: string;
  assembled: string;
  runtime?: LocomotiveRuntimeParts;
  note?: string;
};

export type AtlasRect = { x: number; y: number; width: number; height: number };

export type LocomotiveRuntimeParts = {
  body: string;
  tender: string;
  drivingWheel: string;
  truckWheel: string;
  tenderWheel: string;
  rod: string;
};

export type LocomotiveRuntimeLayout = {
  totalWidth: number;
  canvas: { width: number; height: number };
  tenderWidth: number;
  locomotiveWidth: number;
  smokeSocket: { x: number; y: number };
};

const parts = (directory: string, ..._sourceRects: AtlasRect[]): LocomotiveRuntimeParts => {
  void _sourceRects; // Retained as the audited extraction manifest for the v2 files.
  const root = `/assets/locomotive-shop/v2/${directory}`;
  return {
    body: `${root}/body.webp`,
    tender: `${root}/tender.webp`,
    drivingWheel: "/assets/locomotive-shop/v4/driver.webp",
    truckWheel: "/assets/locomotive-shop/v4/truck.webp",
    tenderWheel: "/assets/locomotive-shop/v4/truck.webp",
    rod: `${root}/rod.webp`,
  };
};

const starterParts: LocomotiveRuntimeParts = {
  body: "/assets/train-v5-locomotive-flare-aligned.webp",
  tender: "/assets/train-v2-tender.webp",
  drivingWheel: "/assets/train-v4-driver-wheel-clean.webp",
  truckWheel: "/assets/train-v3-truck-wheel.webp",
  tenderWheel: "/assets/train-v3-truck-wheel.webp",
  rod: "/assets/train-v3-coupling-rod.webp",
};

// Runtime contract for the v1 shop pack. Drop each optimized atlas at the
// matching public path; the shop automatically replaces its fallback preview.
export const LOCOMOTIVES: readonly Locomotive[] = [
  { id: "tom-thumb", name: "Ironbound No. 1", road: "Ironbound Railway", wheelArrangement: "4-6-0", cost: 0, bondMultiplier: 1, tier: "Starter", atlas: "/assets/train-v3-locomotive-clean.webp", assembled: "/assets/locomotive-shop/v1/assembled/00_ironbound_no_1.webp", runtime: starterParts },
  { id: "southern-4501", name: "Southern Railway No. 4501", road: "Southern Railway", wheelArrangement: "2-8-2", cost: 1_900, bondMultiplier: 1.35, tier: "Tier 1", atlas: "/assets/locomotive-shop/v1/02_southern_4501.webp", assembled: "/assets/locomotive-shop/v1/assembled/02_southern_4501.webp", runtime: parts("southern-4501", { x: 337, y: 14, width: 1111, height: 403 }, { x: 0, y: 386, width: 551, height: 284 }, { x: 700, y: 495, width: 160, height: 160 }, { x: 570, y: 525, width: 140, height: 140 }, { x: 340, y: 675, width: 640, height: 135 }) },
  { id: "prr-1361", name: "PRR K4s No. 1361", road: "Pennsylvania Railroad", wheelArrangement: "4-6-2", cost: 4_000, bondMultiplier: 1.6, tier: "Tier 2", atlas: "/assets/locomotive-shop/v1/03_prr_k4s_1361.webp", assembled: "/assets/locomotive-shop/v1/assembled/03_prr_k4s_1361.webp", runtime: parts("prr-1361", { x: 320, y: 20, width: 1128, height: 418 }, { x: 0, y: 403, width: 611, height: 302 }, { x: 846, y: 466, width: 164, height: 174 }, { x: 614, y: 526, width: 116, height: 116 }, { x: 400, y: 720, width: 650, height: 130 }) },
  { id: "nkp-765", name: "Nickel Plate Road No. 765", road: "Nickel Plate Road", wheelArrangement: "2-8-4", cost: 7_500, bondMultiplier: 1.95, tier: "Tier 3", atlas: "/assets/locomotive-shop/v1/04_nkp_765.webp", assembled: "/assets/locomotive-shop/v1/assembled/04_nkp_765.webp", runtime: parts("nkp-765", { x: 368, y: 160, width: 1079, height: 355 }, { x: 0, y: 485, width: 613, height: 295 }, { x: 608, y: 520, width: 185, height: 185 }, { x: 1320, y: 580, width: 105, height: 105 }, { x: 31, y: 838, width: 806, height: 110 }), note: "Registered component assembly with four visible driving axles." },
  { id: "atsf-3751", name: "Santa Fe No. 3751", road: "Atchison, Topeka & Santa Fe", wheelArrangement: "4-8-4", cost: 12_500, bondMultiplier: 2.4, tier: "Tier 4", atlas: "/assets/locomotive-shop/v1/05_atsf_3751.webp", assembled: "/assets/locomotive-shop/v1/assembled/05_atsf_3751.webp", runtime: parts("atsf-3751", { x: 337, y: 14, width: 1111, height: 395 }, { x: 0, y: 374, width: 612, height: 311 }, { x: 615, y: 410, width: 150, height: 155 }, { x: 1190, y: 440, width: 120, height: 120 }, { x: 30, y: 710, width: 555, height: 168 }) },
  { id: "nw-611", name: "Norfolk & Western No. 611", road: "Norfolk & Western", wheelArrangement: "4-8-4", cost: 22_000, bondMultiplier: 3, tier: "Tier 5", atlas: "/assets/locomotive-shop/v1/06_nw_611.webp", assembled: "/assets/locomotive-shop/v1/assembled/06_nw_611.webp", runtime: parts("nw-611", { x: 395, y: 15, width: 1053, height: 359 }, { x: 0, y: 355, width: 696, height: 315 }, { x: 735, y: 382, width: 158, height: 174 }, { x: 727, y: 566, width: 120, height: 120 }, { x: 675, y: 690, width: 500, height: 120 }) },
  { id: "up-844", name: "Union Pacific No. 844", road: "Union Pacific", wheelArrangement: "4-8-4", cost: 35_000, bondMultiplier: 3.8, tier: "Tier 6", atlas: "/assets/locomotive-shop/v1/07_up_844.webp", assembled: "/assets/locomotive-shop/v1/assembled/07_up_844.webp", runtime: parts("up-844", { x: 325, y: 0, width: 1123, height: 389 }, { x: 0, y: 354, width: 600, height: 300 }, { x: 620, y: 465, width: 155, height: 160 }, { x: 1220, y: 520, width: 110, height: 110 }, { x: 40, y: 760, width: 800, height: 120 }), note: "Provisional: preserved smoke deflectors pending." },
  { id: "nw-1218", name: "Norfolk & Western No. 1218", road: "Norfolk & Western", wheelArrangement: "2-6-6-4", cost: 52_500, bondMultiplier: 5, tier: "Tier 7", atlas: "/assets/locomotive-shop/v1/08_nw_1218.webp", assembled: "/assets/locomotive-shop/v1/assembled/08_nw_1218.webp", runtime: parts("nw-1218", { x: 386, y: 15, width: 1062, height: 342 }, { x: 0, y: 325, width: 662, height: 295 }, { x: 983, y: 337, width: 142, height: 142 }, { x: 814, y: 386, width: 94, height: 94 }, { x: 47, y: 741, width: 597, height: 120 }) },
  { id: "challenger-3985", name: "Union Pacific Challenger No. 3985", road: "Union Pacific", wheelArrangement: "4-6-6-4", cost: 77_500, bondMultiplier: 7, tier: "Tier 8", atlas: "/assets/locomotive-shop/v1/09_up_challenger_3985.webp", assembled: "/assets/locomotive-shop/v1/assembled/09_up_challenger_3985.webp", runtime: parts("challenger-3985", { x: 336, y: 0, width: 1112, height: 390 }, { x: 0, y: 356, width: 599, height: 311 }, { x: 846, y: 375, width: 150, height: 150 }, { x: 610, y: 419, width: 100, height: 100 }, { x: 470, y: 650, width: 700, height: 170 }) },
  { id: "big-boy-4014", name: "Union Pacific Big Boy No. 4014", road: "Union Pacific", wheelArrangement: "4-8-8-4", cost: 110_000, bondMultiplier: 10, tier: "Tier 9 — Big Boy", atlas: "/assets/locomotive-shop/v1/10_up_big_boy_4014.webp", assembled: "/assets/locomotive-shop/v1/assembled/10_up_big_boy_4014.webp", runtime: parts("big-boy-4014", { x: 365, y: 46, width: 1083, height: 313 }, { x: 0, y: 339, width: 630, height: 335 }, { x: 855, y: 365, width: 122, height: 122 }, { x: 690, y: 420, width: 75, height: 75 }, { x: 759, y: 679, width: 659, height: 190 }) },
  { id: "the-flyer-1907", name: "The Flyer, 1907 No. 222", road: "Ironbound Heritage Collection", wheelArrangement: "4-4-2", cost: 145_000, bondMultiplier: 12, tier: "Tier 10 — Atlantic", atlas: "/assets/locomotive-shop/v3/previews/the-flyer-1907.webp", assembled: "/assets/locomotive-shop/v3/previews/the-flyer-1907.webp", runtime: parts("the-flyer-1907"), note: "A high-driver Atlantic recreated from the No. 222 family artwork." },
  { id: "polar-express-1225", name: "Polar Express No. 1225", road: "North Pole Railway", wheelArrangement: "2-8-4", cost: 200_000, bondMultiplier: 15, tier: "Tier 11 — Winter Limited", atlas: "/assets/locomotive-shop/v3/previews/polar-express-1225.webp", assembled: "/assets/locomotive-shop/v3/previews/polar-express-1225.webp", runtime: parts("polar-express-1225"), note: "A winter-limited Berkshire with Pere Marquette 1225 running gear." },
] as const;

export const STARTER_LOCOMOTIVE_ID = LOCOMOTIVES[0].id;

// Each class has a different rigid wheelbase. These values are measured
// against the assembled references in the asset pack rather than inferred
// from one generic chassis, which keeps every axle centered in its wheel well.
const spriteLayout = (id: keyof typeof registration.profiles, totalWidth: number): LocomotiveRuntimeLayout => {
  const profile = registration.profiles[id];
  // Preserve source-pixel scale when a model's drawbar extends its canvas.
  return { totalWidth: totalWidth * profile.canvas.width / registration.canvas.width, canvas: profile.canvas, tenderWidth: profile.tender_width, locomotiveWidth: profile.locomotive_width, smokeSocket: profile.smoke_socket };
};

export const LOCOMOTIVE_RUNTIME_LAYOUTS: Readonly<Record<string, LocomotiveRuntimeLayout>> = Object.freeze({
  "tom-thumb": spriteLayout("tom-thumb", 52.2),
  "southern-4501": spriteLayout("southern-4501", 48),
  "prr-1361": spriteLayout("prr-1361", 49),
  "nkp-765": spriteLayout("nkp-765", 50),
  "atsf-3751": spriteLayout("atsf-3751", 50),
  "nw-611": spriteLayout("nw-611", 50),
  "up-844": spriteLayout("up-844", 50),
  "nw-1218": spriteLayout("nw-1218", 51),
  "challenger-3985": spriteLayout("challenger-3985", 52.2),
  "big-boy-4014": spriteLayout("big-boy-4014", 52.2),
  "the-flyer-1907": spriteLayout("the-flyer-1907", 49),
  "polar-express-1225": spriteLayout("polar-express-1225", 50),
});

export const runtimeWheelRadiusRatios = (engineId: string, layout: LocomotiveRuntimeLayout) => {
  const measured = registration.profiles[engineId as keyof typeof registration.profiles];
  if (!measured) throw new Error(`Incomplete wheel alignment profile: ${engineId}`);
  const radius = (kind: string) => {
    const axle = measured.axles.find((point) => point.kind === kind);
    if (!axle) throw new Error(`Missing ${kind} axle: ${engineId}`);
    return layout.totalWidth / 100 * axle.diameter / layout.canvas.width / 2;
  };
  return { driver: radius("driver"), truck: radius("leading"), tender: radius("tender") };
};
