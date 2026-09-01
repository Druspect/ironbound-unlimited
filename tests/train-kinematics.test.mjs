import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const physics = await readFile(new URL("../app/locomotive-physics.ts", import.meta.url), "utf8");

test("starter uses registered frames instead of a separately lifted shell", () => {
  assert.doesNotMatch(page, /className="locomotive-superstructure"|className="rail-unit locomotive-unit"/);
  assert.match(page, /<LocomotiveSprite engine=\{activeEngine\} motion=\{exhaustMotionRef\}/);
  assert.doesNotMatch(page, /src=\{engine\.assembled\}/);
});

test("reduced-motion mode does not disable functional wheel rotation", () => {
  const reducedMotionRule = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.doesNotMatch(reducedMotionRule, /\.running-wheel/);
  assert.doesNotMatch(reducedMotionRule, /\.connecting-rod/);
});

test("wheel and rod phase derive from accumulated rail distance", () => {
  assert.match(page, /visualTravelRef\.current \+= travelDelta/);
  assert.match(page, /WHEEL_TRAVEL_CALIBRATION = 6\.7/);
  assert.match(page, /CAR_WHEEL_SPEED_RATIO = 0\.92/);
  assert.match(page, /runtimeWheelRadiusRatios\(activeEngineId, activeLayout\)/);
  assert.match(page, /const smallWheelAngle = wheelAngle\(coachRadius, CAR_WHEEL_SPEED_RATIO\)/);
  assert.match(page, /const tenderWheelAngle = wheelAngle\(tenderRadius, CAR_WHEEL_SPEED_RATIO\)/);
  assert.match(page, /const driverWheelAngle = wheelAngle/);
  assert.match(page, /const driverRadians = driverWheelAngle/);
  assert.match(page, /const driverCrankRadius = driverRadius \* 0\.404/);
  assert.match(page, /const driverCrankPhase = 0/);
  assert.match(page, /const smallCrankRadius = coachRadius \* 0\.67/);
  assert.match(page, /--rod-\$\{group\}-x/);
  assert.match(page, /--rod-\$\{group\}-y/);
  assert.match(page, /--small-rod-x/);
  assert.match(page, /--small-rod-y/);
  assert.match(page, /CAR_TRUCK_PHASES/);
  assert.match(css, /--wheel-phase/);
});

test("static car bars are replaced by crankpin-linked truck rods", () => {
  assert.doesNotMatch(page, /truck-frame|tender-frame/);
  assert.match(page, /coach-truck-rod/);
});

test("no decorative pilot wheel fills the transparent rear opening", () => {
  assert.doesNotMatch(page, /ENGINE_SMALL_WHEEL_POSITIONS/);
  assert.doesNotMatch(page, /engine-small-wheel/);
});

test("control deck uses one unlabeled color regulator with only whistle and brake buttons", () => {
  const controls = page.slice(
    page.indexOf('<div className="throttle-control">'),
    page.indexOf("</section>", page.indexOf('<div className="throttle-control">')),
  );

  assert.match(controls, /className="regulator-input"/);
  assert.match(controls, /className="regulator-rail"/);
  assert.match(controls, /className="whistle-button"/);
  assert.match(controls, />BRAKE</);
  assert.equal((controls.match(/<button/g) ?? []).length, 2);
  assert.doesNotMatch(controls, /LOCOMOTIVE REGULATOR|regulator-labels|>CLOSED<|>WORKING<|>FULL</);
  assert.doesNotMatch(controls, />HALF STEAM</);
  assert.doesNotMatch(controls, />COAST</);
  assert.doesNotMatch(page, /SKY PHASE/);
});

test("brake pressure builds progressively while speed and distance remain simulated", () => {
  const brakeHandler = page.slice(page.indexOf("const brake = useCallback"), page.indexOf("useEffect(() => {", page.indexOf("const brake = useCallback")));

  assert.match(page, /advanceBrakePressure\(brakePressureRef\.current, brakeRef\.current, elapsedSeconds\)/);
  assert.match(page, /advanceLocomotive\([\s\S]*brakePressureRef\.current\);/);
  assert.match(page, /speedRef\.current = next\.speed;/);
  assert.match(page, /distanceRef\.current = next\.distance;/);
  assert.doesNotMatch(brakeHandler, /speedRef\.current = 0|setSpeed\(0\)/);
  assert.match(physics, /serviceBrakeTimeConstant/);
  assert.match(physics, /brakeApplication = 0/);
  assert.match(physics, /distance: state\.distance \+ \(\(state\.speed \+ speed\) \* 0\.5\)/);
  assert.match(page, /next > 0 && brakeRef\.current/);
  assert.match(page, /aria-pressed=\{brakeEngaged\}/);
});

test("both coach bogies and rods move inward together without changing wheel size", () => {
  assert.match(page, /COACH_WHEEL_POSITIONS = \[11, 25, 64, 78\]/);
  assert.match(css, /\.coach-truck-rod\.truck-rod-a \{ left: 15\.8%; \}/);
  assert.match(css, /\.coach-truck-rod\.truck-rod-b \{ left: 68\.8%; \}/);
  assert.match(css, /\.small-wheel \{ bottom: 4%; width: 12\.5%; \}/);
  assert.match(page, /const coachRadius = CAR_RENDER_WIDTH \* \.125 \/ 2/);
  assert.doesNotMatch(page, /const coachRadius[^;]*runtimeRadii/);
  assert.doesNotMatch(page, /Train screensaver game\./);
});

test("every carriage body resolves to the same visible underframe baseline", () => {
  const canvasWidth = 900;
  const carWidth = 190;
  const bodyBoxHeight = 150 * .76;
  const bodyBottom = 150 * .14;
  const profiles = [
    { name: "day coach", transparentBottom: 1, shift: 0 },
    { name: "baggage", transparentBottom: 5, shift: .7 },
    { name: "dining", transparentBottom: 39, shift: 7 },
    { name: "observation", transparentBottom: 26, shift: 4.6 },
    { name: "pullman", transparentBottom: 31, shift: 5.5 },
  ];
  const baselines = profiles.map(({ transparentBottom, shift }) =>
    bodyBottom + transparentBottom * carWidth / canvasWidth - bodyBoxHeight * shift / 100
  );
  assert.ok(Math.max(...baselines) - Math.min(...baselines) < .25, `body baselines diverge: ${baselines.join(", ")}`);
  for (const { name, shift } of profiles.filter(({ shift }) => shift > 0)) {
    const className = name === "day coach" ? "day-coach" : name;
    assert.match(css, new RegExp(`\\.car-${className} \\{ --car-body-baseline-shift: ${String(shift).replace(".", "\\.")}%; \\}`));
  }
});

test("coach tires and the near rail share one camera-aware contact plane", () => {
  assert.match(page, /"--scaled-wheel-inset": `\$\{6 \* cameraScale\}px`/);
  assert.match(css, /--train-base-lift: 22px/);
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*--train-base-lift: 20px/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*--train-base-lift: 16px/);
  assert.match(css, /\.train-wrap\s*\{[^}]*bottom:\s*calc\(var\(--hud-clearance\) \+ var\(--train-base-lift\)\)/s);
  assert.match(css, /\.rail-near\s*\{[^}]*bottom:\s*calc\(var\(--train-base-lift\) \+ var\(--scaled-wheel-inset\) - 6px\)/s);
  assert.doesNotMatch(css.match(/\.rail-near\s*\{[^}]*\}/s)?.[0] ?? "", /rotate\(/);
  for (const cameraScale of [.16, .42, .779, 1, 1.04]) {
    const wheelContactLift = 22 + 6 * cameraScale;
    const railTopLift = 22 + 6 * cameraScale - 6 + 6;
    assert.equal(railTopLift, wheelContactLift, `contact at camera scale ${cameraScale}`);
  }
});

test("side cards are transparent overlays and the regulator is a dynamic green-to-red rail", () => {
  assert.match(css, /\.mission-card,[\s\S]*background:\s*linear-gradient\(90deg,[^;]*transparent\);[\s\S]*border-left:\s*2px solid/s);
  assert.match(css, /\.right-hud \.speed-card,[\s\S]*background:\s*linear-gradient\(270deg,[^;]*transparent\);[\s\S]*border-right:\s*2px solid/s);
  assert.match(page, /--throttle-color/);
  assert.match(css, /\.regulator-rail\s*\{[^}]*linear-gradient\(90deg, #268c45[^}]*#bd332a 100%/s);
  assert.match(css, /\.regulator-live\s*\{[^}]*width:\s*calc\(var\(--throttle-fill\)/s);
  assert.match(css, /\.regulator-glow\s*\{[^}]*left:\s*clamp\(0%, var\(--throttle-fill\), 100%\)/s);
  assert.doesNotMatch(page, /--regulator-angle/);
  assert.doesNotMatch(css, /\.regulator-arm/);
});

test("the cab exposes consequences without revealing a correct throttle answer", () => {
  assert.match(page, /sampleRouteProfile/);
  assert.match(page, /className={`heat-monitor heat-\${heatTone}`}/);
  assert.match(page, /safeDrivingBonus/);
  assert.doesNotMatch(page, /<em>\{throttle\}%<\/em>/);
  assert.doesNotMatch(page, /optimal-throttle|throttle-marker|correct throttle/i);
});

test("right HUD cards flow in a stack instead of overlapping coordinates", () => {
  assert.match(page, /className="right-hud"/);
  assert.match(css, /\.right-hud\s*\{[^}]*display:\s*grid[^}]*gap:/s);
  assert.match(css, /\.speed-card \.eyebrow\s*\{[^}]*white-space:\s*nowrap/s);
});

test("visible scene assets use compact WebP sources", () => {
  assert.doesNotMatch(page, /\/assets\/[^"]+\.png/);
  assert.doesNotMatch(css, /\/assets\/[^")]+\.png/);
  assert.doesNotMatch(layout, /\/assets\/[^"]+\.png/);
  assert.match(page, /decoding="async"/);
  assert.equal((layout.match(/rel="preload"/g) ?? []).length, 1);
});

test("shop and running train share fixed-canvas sprite artwork", () => {
  assert.match(page, /engine\.id === STARTER_LOCOMOTIVE_ID/);
  assert.doesNotMatch(page, /src=\{activeEngine\.assembled\}/);
  assert.doesNotMatch(page, /function AtlasPart/);
  assert.match(page, /function LocomotiveSprite/);
  assert.match(page, /<LocomotiveSprite engine=\{activeEngine\}/);
  assert.match(page, /<LocomotiveSprite engine=\{engine\} mode="preview"/);
  assert.match(page, /assetRoot = "\/assets\/locomotive-shop\/v3"/);
  assert.match(page, /\$\{assetRoot\}\/previews/);
  assert.match(page, /\$\{assetRoot\}\/sprites/);
  assert.match(page, /component-engine-consist/);
  assert.match(css, /\.engine-sprite-unit/);
  assert.match(css, /background-size:\s*var\(--sprite-sheet-width, 800%\) var\(--sprite-sheet-height, 400%\)/);
  assert.match(css, /aspect-ratio:\s*var\(--sprite-aspect\)/);
  assert.match(page, /LOCOMOTIVE_SPRITE_CANVAS\.height/);
  assert.match(page, /360 \/ LOCOMOTIVE_SPRITE_ANIMATION\.frames/);
  assert.match(page, /% LOCOMOTIVE_SPRITE_ANIMATION\.frames/);
  assert.match(page, /ironbound-steam-whistle\.wav/);
  assert.doesNotMatch(page, /createOscillator|AudioContext/);
  assert.match(page, /--engine-sprite-x/);
  assert.match(page, /--engine-sprite-y/);
  assert.doesNotMatch(page, /runtime-wheel-slot/);
  assert.match(page, /--rod-\$\{group\}-x/);
  assert.doesNotMatch(page, /runtime-tender-truck/);
  assert.doesNotMatch(page, /intro-station/);
  assert.doesNotMatch(page, /A RAIL BONDS JOURNEY/);
});

test("every locomotive uses its own stack socket and travel-driven textured exhaust", async () => {
  const exhaust = await readFile(new URL("../app/locomotive-exhaust-view.tsx", import.meta.url), "utf8");
  assert.match(page, /layout\.smokeSocket\.x/);
  assert.match(page, /layout\.smokeSocket\.y/);
  assert.match(page, /travel: railTravel, driverRadius, speed: velocity/);
  assert.match(page, /<ExhaustSmoke key=\{engine\.id\}/);
  assert.match(exhaust, /exhaust-puff\.webp/);
  assert.match(exhaust, /cancelAnimationFrame/);
  assert.doesNotMatch(css, /@keyframes exhaust-drift/);
  assert.doesNotMatch(page, /--smoke-time/);
  assert.doesNotMatch(css, /@keyframes smoke-rise/);
  assert.doesNotMatch(page, /alternate-smoke-stack/);
});

test("route uses six five-tile biomes with broad feathered overlaps", () => {
  assert.match(page, /const TILES_PER_BIOME = 5/);
  assert.match(page, /name: "Salt Flats"/);
  assert.match(page, /name: "Alpine Pass"/);
  assert.match(css, /salt-flats-v1\.webp/);
  assert.match(css, /alpine-pass-v1\.webp/);
  assert.match(css, /calc\(100vw \+ 520px\)/);
  assert.match(css, /#000 420px/);
});
