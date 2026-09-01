"use client";

import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { ExhaustSmoke } from "./locomotive-exhaust-view";
import { createExhaustMotion } from "./locomotive-exhaust";
import type { ExhaustMotion } from "./locomotive-exhaust";
import { advanceBrakePressure, advanceLocomotive } from "./locomotive-physics";
import { ACTIVE_LOCOMOTIVES, canEquipLocomotive, FLEET_REVIEW_UNLOCKED, resolveEquippedLocomotive, selectLocomotive } from "./fleet-access";
import { engineFactSheetFor } from "./engine-facts";
import { LOCOMOTIVES, LOCOMOTIVE_RUNTIME_LAYOUTS, LOCOMOTIVE_SPRITE_ANIMATION, LOCOMOTIVE_SPRITE_CANVAS, LOCOMOTIVE_SPRITE_RAIL_INSET, LOCOMOTIVE_ART_REVISION, STARTER_LOCOMOTIVE_ID, runtimeWheelRadiusRatios } from "./locomotive-catalog";
import type { Locomotive } from "./locomotive-catalog";
import {
  createSafeDrivingProgress,
  recordSafeDrivingDistance,
  safeDrivingBonus,
} from "./run-economy";
import { ROUTE_TILE_TRAVEL, sampleRouteProfile } from "./route-profile";
import { calculateTrainSceneGeometry } from "./train-geometry";
import type { CameraMode } from "./train-geometry";
import {
  CONSIST_CAR_TYPES,
  DEFAULT_CONSIST,
  advanceSteamResources,
  calculateConsistMetrics,
  calculateServiceDurationSeconds,
  carTypeFor,
  createSteamResourceState,
  operatingProfileFor,
  recordPassedStation,
  serviceSteamLocomotive,
  stationsUntilServiceRequired,
} from "./steam-operations";

type SceneStyle = CSSProperties & Record<`--${string}`, string | number>;

const BIOMES = [
  { name: "High Plains", short: "PLAINS" },
  { name: "Red Mesa", short: "MESA" },
  { name: "Salt Flats", short: "SALT" },
  { name: "Pine Divide", short: "PINES" },
  { name: "Alpine Pass", short: "ALPINE" },
  { name: "River Basin", short: "RIVER" },
] as const;

const TILES_PER_BIOME = 5;
const TILE_TRAVEL = ROUTE_TILE_TRAVEL;
const ROUTE_TILE_COUNT = BIOMES.length * TILES_PER_BIOME;
const ROUTE_TRAVEL = ROUTE_TILE_COUNT * TILE_TRAVEL;

// Move each complete bogie 3% toward the coach center. Rod anchors shift with it.
const COACH_WHEEL_POSITIONS = [11, 25, 64, 78] as const;
// These ratios mirror the rendered CSS geometry below. Wheel phase is tied to
// rail travel, so the axles cannot stop, restart, or drift when speed changes.
const SMALL_WHEEL_RADIUS_RATIO = 0.01535;
const DRIVER_WHEEL_RADIUS_RATIO = 0.03375;
// Slight visual calibration against the perspective-skewed sleeper texture.
// Track geometry still advances at 7.2; the wheel faces use the lower factor
// to remove the small apparent over-speed reported during visual review.
const WHEEL_TRAVEL_CALIBRATION = 6.7;
const CAR_WHEEL_SPEED_RATIO = 0.92;
const CAR_TRUCK_PHASES = [0, 34, 17, 51, 11, 45, 23, 57, 7, 41, 29, 63] as const;
const CAR_RENDER_WIDTH = 190;
const ENGINE_RENDER_BASE_WIDTH = 420;

const ROUTE_TILES = Array.from({ length: ROUTE_TILE_COUNT + 2 }, (_, index) => {
  const routeIndex = index % ROUTE_TILE_COUNT;
  return {
    key: `${index}-${routeIndex}`,
    biome: Math.floor(routeIndex / TILES_PER_BIOME),
    tile: routeIndex % TILES_PER_BIOME,
  };
});

const STATIONS = [
  { name: "Cinder Flats", position: 0.82 * TILE_TRAVEL, reward: "250 rail bonds", bonds: 250, art: "plains" },
  { name: "Copper Wash", position: 5.82 * TILE_TRAVEL, reward: "400 rail bonds", bonds: 400, art: "mesa" },
  { name: "Saltworks", position: 10.82 * TILE_TRAVEL, reward: "525 rail bonds", bonds: 525, art: "plains" },
  { name: "Timberline", position: 15.82 * TILE_TRAVEL, reward: "Boiler shield + 650 bonds", bonds: 650, art: "pine" },
  { name: "Summit House", position: 20.82 * TILE_TRAVEL, reward: "800 rail bonds", bonds: 800, art: "pine" },
  { name: "Stillwater", position: 25.82 * TILE_TRAVEL, reward: "1,000 rail bonds", bonds: 1000, art: "river" },
] as const;

type StationState = {
  index: number;
  distance: number;
  inZone: boolean;
  dwell: number;
  collected: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const finiteOr = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

function LocomotiveSprite({ engine, mode = "running", motion }: { engine: Locomotive; mode?: "running" | "preview"; motion?: RefObject<ExhaustMotion> }) {
  const layout = LOCOMOTIVE_RUNTIME_LAYOUTS[engine.id];
  if (!layout) throw new Error(`Missing sprite profile for ${engine.id}`);
  const assetRoot = "/assets/locomotive-shop/v3";

  if (mode === "preview") {
    return <img className="engine-sprite-preview" src={`${assetRoot}/previews/${engine.id}.webp?v=${LOCOMOTIVE_ART_REVISION}`} alt="" draggable={false} decoding="async" />;
  }

  return (
    <div
      className={`engine-sprite-unit engine-sprite-${engine.id}`}
      style={{
        "--runtime-total-width": `${layout.totalWidth}%`,
        "--sprite-aspect": `${layout.canvas.width} / ${LOCOMOTIVE_SPRITE_CANVAS.height}`,
        "--sprite-sheet-width": `${LOCOMOTIVE_SPRITE_ANIMATION.columns * 100}%`,
        "--sprite-sheet-height": `${(LOCOMOTIVE_SPRITE_ANIMATION.frames / LOCOMOTIVE_SPRITE_ANIMATION.columns) * 100}%`,
        "--sprite-rail-inset": `${LOCOMOTIVE_SPRITE_RAIL_INSET}%`,
        "--smoke-socket-x": `${layout.smokeSocket.x}%`,
        "--smoke-socket-y": `${layout.smokeSocket.y}%`,
      } as SceneStyle}
      data-engine-sprite={engine.id}
      aria-hidden="true"
    >
      <span className="engine-sprite-frame" style={{ backgroundImage: `url("${assetRoot}/sprites/${engine.id}.webp?v=${LOCOMOTIVE_ART_REVISION}")` }} />
      {engine.id === STARTER_LOCOMOTIVE_ID && <>
        <div className="headlight-system"><i /></div>
        <div className="whistle-steam" />
        <div className="steam-vent" />
      </>}
      {motion && <ExhaustSmoke key={engine.id} motion={motion} />}
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<"intro" | "game" | "shop" | "options">("intro");
  const [storeTab, setStoreTab] = useState<"engines" | "carriages" | "audio">("engines");
  const [throttle, setThrottle] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [boilerLoad, setBoilerLoad] = useState(42);
  const [heat, setHeat] = useState(0);
  const [overloaded, setOverloaded] = useState(false);
  const [gradePercent, setGradePercent] = useState(() => sampleRouteProfile(0).gradePercent);
  const [distance, setDistance] = useState(0);
  const [paused, setPaused] = useState(true);
  const [brakeEngaged, setBrakeEngaged] = useState(true);
  const [brakePressure, setBrakePressure] = useState(0);
  const [whistling, setWhistling] = useState(false);
  const [biomeState, setBiomeState] = useState({ current: 0, next: 1, mix: 0, tile: 0 });
  const [stationState, setStationState] = useState<StationState>({ index: 0, distance: STATIONS[0].position, inZone: false, dwell: 0, collected: false });
  const [bonds, setBonds] = useState(0);
  const [ownedEngines, setOwnedEngines] = useState<string[]>([STARTER_LOCOMOTIVE_ID]);
  const [equippedEngine, setEquippedEngine] = useState(STARTER_LOCOMOTIVE_ID);
  const [consistCars, setConsistCars] = useState<string[]>([...DEFAULT_CONSIST]);
  const [cameraZoom, setCameraZoom] = useState<CameraMode>("auto");
  const [viewportWidth, setViewportWidth] = useState(1365);
  const [steamResources, setSteamResources] = useState(createSteamResourceState);
  const [runFailure, setRunFailure] = useState<"fuel" | "water" | "service" | null>(null);
  const [settings, setSettings] = useState({ sound: true, reducedMotion: false, highContrast: false, uiScale: 100 });
  const [saveReady, setSaveReady] = useState(false);
  const [rewardNotice, setRewardNotice] = useState<{ station: string; reward: string; bonus?: string; service?: string } | null>(null);
  const throttleRef = useRef(throttle);
  const pausedRef = useRef(paused);
  const brakeRef = useRef(brakeEngaged);
  const brakePressureRef = useRef(brakePressure);
  const speedRef = useRef(speed);
  const boilerRef = useRef(boilerLoad);
  const heatRef = useRef(heat);
  const overloadRef = useRef(overloaded);
  const safetyLockRef = useRef(0);
  const gradeRef = useRef(gradePercent);
  const distanceRef = useRef(distance);
  const experienceRef = useRef<HTMLElement | null>(null);
  const visualTravelRef = useRef(0);
  const whistleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const whistleAudioRef = useRef<HTMLAudioElement | null>(null);
  const rewardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellRef = useRef({ station: -1, milliseconds: 0 });
  const claimedStopsRef = useRef(new Set<string>());
  const equippedEngineRef = useRef(equippedEngine);
  const consistCarsRef = useRef(consistCars);
  const steamResourcesRef = useRef(steamResources);
  const lastPassedStationRef = useRef(-1);
  const servicedStationRef = useRef(-1);
  const runFailureRef = useRef<typeof runFailure>(null);
  const safeDrivingRef = useRef(createSafeDrivingProgress());
  const visualQaModeRef = useRef(false);
  const exhaustMotionRef = useRef(createExhaustMotion());

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { exhaustMotionRef.current.reducedMotion = settings.reducedMotion || preference.matches; };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, [settings.reducedMotion]);

  useEffect(() => {
    equippedEngineRef.current = equippedEngine;
  }, [equippedEngine]);

  useEffect(() => {
    consistCarsRef.current = consistCars;
  }, [consistCars]);

  useEffect(() => {
    const measureViewport = () => setViewportWidth(Math.max(320, window.innerWidth));
    measureViewport();
    window.addEventListener("resize", measureViewport, { passive: true });
    return () => window.removeEventListener("resize", measureViewport);
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const qaParameters = process.env.NODE_ENV !== "production"
          ? new URLSearchParams(window.location.search)
          : null;
        const qaEngineId = qaParameters?.get("qaEngine") ?? null;
        const qaEngine = ACTIVE_LOCOMOTIVES.find((engine) => engine.id === qaEngineId);
        if (qaEngine) {
          visualQaModeRef.current = true;
          const qaCarCount = Number(qaParameters?.get("qaCars"));
          if (qaCarCount === 3 || qaCarCount === 6) {
            const qaConsist = Array.from({ length: qaCarCount }, (_, index) => DEFAULT_CONSIST[index % DEFAULT_CONSIST.length]);
            consistCarsRef.current = qaConsist;
            setConsistCars(qaConsist);
          }
          const qaStationParameter = qaParameters?.get("qaStation");
          const qaStationIndex = qaStationParameter === null || qaStationParameter === undefined
            ? Number.NaN
            : Number(qaStationParameter);
          if (Number.isInteger(qaStationIndex) && qaStationIndex >= 0 && qaStationIndex < STATIONS.length) {
            visualTravelRef.current = STATIONS[qaStationIndex].position;
            distanceRef.current = STATIONS[qaStationIndex].position;
            lastPassedStationRef.current = qaStationIndex;
            setDistance(STATIONS[qaStationIndex].position);
          }
          setOwnedEngines([STARTER_LOCOMOTIVE_ID, qaEngine.id]);
          setEquippedEngine(qaEngine.id);
          brakeRef.current = true;
          setBrakeEngaged(true);
          if (qaParameters?.get("qaService") === "active") {
            steamResourcesRef.current = { fuel: 10, water: 10, stationsWithoutService: 3, failure: null };
            setSteamResources(steamResourcesRef.current);
          }
          const qaFailure = qaParameters?.get("qaFailure");
          if (qaFailure === "fuel" || qaFailure === "water" || qaFailure === "service") {
            runFailureRef.current = qaFailure;
            steamResourcesRef.current = { ...steamResourcesRef.current, failure: qaFailure };
            setSteamResources(steamResourcesRef.current);
            setRunFailure(qaFailure);
          }
          setScreen("game");
          pausedRef.current = Boolean(runFailureRef.current);
          setPaused(pausedRef.current);
        } else {
          const saved = localStorage.getItem("ironbound-save-v3") ?? localStorage.getItem("ironbound-save-v2") ?? localStorage.getItem("ironbound-save-v1");
          if (saved) {
            const parsed = JSON.parse(saved) as { bonds?: number; ownedEngines?: string[]; equippedEngine?: string; consistCars?: string[]; cameraZoom?: CameraMode; settings?: typeof settings; run?: { throttle?: number; speed?: number; boilerLoad?: number; heat?: number; distance?: number; visualTravel?: number; brakeEngaged?: boolean; fuel?: number; coal?: number; water?: number; stationsWithoutService?: number; failure?: "fuel" | "coal" | "water" | "service" | null } };
            if (typeof parsed.bonds === "number") setBonds(Math.max(0, parsed.bonds));
            const owned = Array.from(new Set([STARTER_LOCOMOTIVE_ID, ...(Array.isArray(parsed.ownedEngines) ? parsed.ownedEngines.filter((id) => LOCOMOTIVES.some((engine) => engine.id === id)) : [])]));
            setOwnedEngines(owned);
            if (typeof parsed.equippedEngine === "string") setEquippedEngine(resolveEquippedLocomotive(parsed.equippedEngine, owned));
            if (Array.isArray(parsed.consistCars) && parsed.consistCars.length >= 3 && parsed.consistCars.length <= 6) {
              const validCars = parsed.consistCars.filter((id) => CONSIST_CAR_TYPES.some((car) => car.id === id));
              if (validCars.length === parsed.consistCars.length) setConsistCars(validCars);
            }
            if (parsed.cameraZoom === "auto" || parsed.cameraZoom === "close" || parsed.cameraZoom === "standard" || parsed.cameraZoom === "wide") setCameraZoom(parsed.cameraZoom);
            if (parsed.settings) setSettings((current) => ({ ...current, ...parsed.settings }));
            if (parsed.run) {
              const restoredThrottle = clamp(finiteOr(parsed.run.throttle, 0), 0, 100);
              const restoredSpeed = clamp(finiteOr(parsed.run.speed, 0), 0, 140);
              const restoredBoiler = clamp(finiteOr(parsed.run.boilerLoad, 42), 0, 100);
              const restoredHeat = clamp(finiteOr(parsed.run.heat, 0), 0, 100);
              const restoredDistance = Math.max(0, finiteOr(parsed.run.distance, 0));
              const restoredFailure = parsed.run.failure === "coal" || parsed.run.failure === "fuel"
                ? "fuel"
                : parsed.run.failure === "water" || parsed.run.failure === "service"
                  ? parsed.run.failure
                  : null;
              const restoredResources = {
                fuel: clamp(finiteOr(parsed.run.fuel ?? parsed.run.coal, 100), 0, 100),
                water: clamp(finiteOr(parsed.run.water, 100), 0, 100),
                stationsWithoutService: clamp(Math.floor(finiteOr(parsed.run.stationsWithoutService, 0)), 0, 4),
                failure: restoredFailure,
              } as const;
              throttleRef.current = restoredThrottle;
              speedRef.current = restoredSpeed;
              boilerRef.current = restoredBoiler;
              heatRef.current = restoredHeat;
              distanceRef.current = restoredDistance;
              visualTravelRef.current = Math.max(0, finiteOr(parsed.run.visualTravel, 0));
              lastPassedStationRef.current = Math.floor((visualTravelRef.current - STATIONS[0].position) / (TILES_PER_BIOME * TILE_TRAVEL));
              brakeRef.current = parsed.run.brakeEngaged !== false;
              steamResourcesRef.current = restoredResources;
              runFailureRef.current = restoredFailure;
              setThrottle(restoredThrottle);
              setSpeed(restoredSpeed);
              setBoilerLoad(restoredBoiler);
              setHeat(restoredHeat);
              setDistance(restoredDistance);
              setBrakeEngaged(brakeRef.current);
              setSteamResources(restoredResources);
              setRunFailure(restoredFailure);
            }
          }
        }
      } catch {
        // A damaged local save falls back to a clean railway ledger.
      }
      setSaveReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!saveReady || visualQaModeRef.current) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem("ironbound-save-v3", JSON.stringify({
        bonds, ownedEngines, equippedEngine, consistCars, cameraZoom, settings,
        run: { throttle, speed, boilerLoad, heat, distance, visualTravel: visualTravelRef.current, brakeEngaged, fuel: steamResources.fuel, water: steamResources.water, stationsWithoutService: steamResources.stationsWithoutService, failure: runFailure },
      }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [bonds, ownedEngines, equippedEngine, consistCars, cameraZoom, settings, throttle, speed, boilerLoad, heat, distance, brakeEngaged, steamResources, runFailure, saveReady]);

  useEffect(() => {
    document.documentElement.style.setProperty("--user-ui-scale", String(settings.uiScale / 100));
  }, [settings.uiScale]);

  useEffect(() => {
    const whistle = new Audio("/assets/audio/ironbound-steam-whistle.wav");
    whistle.preload = "auto";
    whistle.volume = 0.72;
    whistleAudioRef.current = whistle;
    return () => {
      whistle.pause();
      whistleAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    throttleRef.current = throttle;
  }, [throttle]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let lastHudUpdate = 0;

    const renderMotion = (now: number) => {
      const delta = Math.min(50, now - last);
      last = now;
      const routeSample = sampleRouteProfile(visualTravelRef.current);
      gradeRef.current = routeSample.gradePercent;
      const operatingProfile = operatingProfileFor(equippedEngineRef.current);
      const consistMetrics = calculateConsistMetrics(equippedEngineRef.current, consistCarsRef.current);
      if (!pausedRef.current) {
        const elapsedSeconds = delta / 1000;
        brakePressureRef.current = advanceBrakePressure(brakePressureRef.current, brakeRef.current, elapsedSeconds);

        const next = advanceLocomotive({
          speed: speedRef.current,
          boilerLoad: boilerRef.current,
          heat: heatRef.current,
          overloaded: overloadRef.current,
          safetyLockSeconds: safetyLockRef.current,
          distance: distanceRef.current,
        }, throttleRef.current, elapsedSeconds, gradeRef.current, brakePressureRef.current, {
          maximumSpeed: operatingProfile.maximumSpeedMph * consistMetrics.maximumSpeedFactor,
          accelerationFactor: consistMetrics.accelerationFactor,
          brakeResponseFactor: consistMetrics.brakeResponseFactor,
          throttleResponseFactor: operatingProfile.throttleResponseFactor,
          adhesionFactor: operatingProfile.adhesionFactor,
          steamingCapacityFactor: operatingProfile.steamingCapacityFactor,
          brakeRiggingFactor: operatingProfile.brakeRiggingFactor,
          thermalLoadFactor: consistMetrics.resourceLoadFactor / operatingProfile.thermalEfficiency *
            (1 + clamp((25 - steamResourcesRef.current.water) / 25, 0, 1) * .22),
        });
        speedRef.current = next.speed;
        boilerRef.current = next.boilerLoad;
        heatRef.current = next.heat;
        overloadRef.current = next.overloaded;
        safetyLockRef.current = next.safetyLockSeconds;
        distanceRef.current = next.distance;

        const nextResources = advanceSteamResources(
          steamResourcesRef.current,
          operatingProfile,
          consistMetrics,
          {
            throttle: throttleRef.current,
            boilerLoad: next.boilerLoad,
            heat: next.heat,
            speed: next.speed,
          },
          elapsedSeconds,
        );
        steamResourcesRef.current = nextResources;
        if (nextResources.failure && !runFailureRef.current) {
          runFailureRef.current = nextResources.failure;
          pausedRef.current = true;
          setPaused(true);
          setRunFailure(nextResources.failure);
        }
      }
      const velocity = pausedRef.current ? 0 : speedRef.current;
      const travelDelta = velocity * (delta / 1000);
      visualTravelRef.current += travelDelta;
      safeDrivingRef.current = recordSafeDrivingDistance(
        safeDrivingRef.current,
        travelDelta,
        speedRef.current,
      );
      const root = experienceRef.current;
      if (root) {
        const fullTilePosition = visualTravelRef.current / TILE_TRAVEL;
        const routeTilePosition = fullTilePosition % ROUTE_TILE_COUNT;
        const currentTile = Math.floor(routeTilePosition);
        const tileInBiome = currentTile % TILES_PER_BIOME;
        const currentBiome = Math.floor(currentTile / TILES_PER_BIOME);
        const localProgress = routeTilePosition % 1;
        const rawMix = tileInBiome === TILES_PER_BIOME - 1
          ? clamp((localProgress - 0.04) / 0.92, 0, 1)
          : 0;
        const biomeMix = rawMix * rawMix * (3 - 2 * rawMix);
        const nextBiome = (currentBiome + 1) % BIOMES.length;
        const viewportWidth = Math.max(320, window.innerWidth);
        const routeDistance = visualTravelRef.current % ROUTE_TRAVEL;
        const routeLoop = Math.floor(visualTravelRef.current / ROUTE_TRAVEL);

        const stationInterval = TILES_PER_BIOME * TILE_TRAVEL;
        const latestPassedStation = Math.floor((visualTravelRef.current - STATIONS[0].position) / stationInterval);
        if (latestPassedStation > lastPassedStationRef.current) {
          for (let sequence = lastPassedStationRef.current + 1; sequence <= latestPassedStation; sequence += 1) {
            if (sequence < 0 || sequence === servicedStationRef.current) continue;
            steamResourcesRef.current = recordPassedStation(steamResourcesRef.current);
          }
          lastPassedStationRef.current = latestPassedStation;
          if (steamResourcesRef.current.failure && !runFailureRef.current) {
            runFailureRef.current = steamResourcesRef.current.failure;
            pausedRef.current = true;
            setPaused(true);
            setRunFailure(steamResourcesRef.current.failure);
          }
        }

        let nextStationIndex = 0;
        let nextStationDistance = ROUTE_TRAVEL;
        let stopStationIndex = -1;
        let stopStationDistance = ROUTE_TRAVEL;

        STATIONS.forEach((station, index) => {
          const forwardDistance = (station.position - routeDistance + ROUTE_TRAVEL) % ROUTE_TRAVEL;
          let signedDistance = forwardDistance;
          if (signedDistance > ROUTE_TRAVEL / 2) signedDistance -= ROUTE_TRAVEL;
          // The station's platform anchor is centered on the passenger consist,
          // not the locomotive pilot, so boarding cars berth beside the platform.
          const stationX = viewportWidth * 0.40 + signedDistance * (viewportWidth / TILE_TRAVEL);
          const stationOpacity = clamp(1 - Math.max(0, Math.abs(signedDistance) - TILE_TRAVEL * 0.55) / (TILE_TRAVEL * 0.25), 0, 1);
          root.style.setProperty(`--station-${index}-x`, `${stationX}px`);
          root.style.setProperty(`--station-${index}-opacity`, String(stationOpacity));

          if (forwardDistance < nextStationDistance) {
            nextStationDistance = forwardDistance;
            nextStationIndex = index;
          }
          if (Math.abs(signedDistance) < Math.abs(stopStationDistance)) {
            stopStationDistance = signedDistance;
            stopStationIndex = index;
          }
        });

        const stopKey = `${routeLoop}-${stopStationIndex}`;
        const inStopZone = stopStationIndex >= 0 && Math.abs(stopStationDistance) <= 130;
        const stopCollected = claimedStopsRef.current.has(stopKey);
        const serviceDurationMilliseconds = calculateServiceDurationSeconds(steamResourcesRef.current, consistMetrics) * 1000;
        if (inStopZone && speedRef.current < 2.5 && !stopCollected) {
          if (dwellRef.current.station !== stopStationIndex) {
            dwellRef.current = { station: stopStationIndex, milliseconds: 0 };
          }
          dwellRef.current.milliseconds += delta;
          if (dwellRef.current.milliseconds >= serviceDurationMilliseconds) {
            const station = STATIONS[stopStationIndex];
            const stationSequence = routeLoop * STATIONS.length + stopStationIndex;
            claimedStopsRef.current.add(stopKey);
            servicedStationRef.current = stationSequence;
            steamResourcesRef.current = serviceSteamLocomotive(steamResourcesRef.current);
            const multiplier = LOCOMOTIVES.find((engine) => engine.id === equippedEngineRef.current)?.bondMultiplier ?? 1;
            const earnedBonds = Math.round(station.bonds * multiplier);
            const drivingBonus = safeDrivingBonus(station.bonds, safeDrivingRef.current);
            setBonds((current) => current + earnedBonds + drivingBonus);
            setRewardNotice({
              station: station.name,
              reward: `${earnedBonds.toLocaleString()} rail bonds`,
              bonus: drivingBonus > 0
                ? `Steady hand +${drivingBonus.toLocaleString()} bonds`
                : undefined,
              service: `${engineFactSheetFor(equippedEngineRef.current).fuelType === "oil" ? "Oil" : "Coal"} and water restored to full`,
            });
            safeDrivingRef.current = createSafeDrivingProgress();
            if (rewardTimer.current) clearTimeout(rewardTimer.current);
            rewardTimer.current = setTimeout(() => setRewardNotice(null), 4200);
          }
        } else if (!inStopZone || speedRef.current >= 2.5) {
          dwellRef.current = { station: -1, milliseconds: 0 };
        }

        root.style.setProperty("--route-x", `${-(routeTilePosition * viewportWidth)}px`);
        root.style.setProperty("--scrub-x", `${-((visualTravelRef.current * 2.1) % 900)}px`);
        root.style.setProperty("--scrub-x-fast", `${-((visualTravelRef.current * 3.57) % 900)}px`);
        root.style.setProperty("--track-x", `${-((visualTravelRef.current * 7.2) % 160)}px`);
        const movement = clamp(velocity / 70, 0, 1);
        const runningPhase = visualTravelRef.current * 0.18;
        root.style.setProperty("--train-bob", `${Math.sin(runningPhase) * movement * 1.35}px`);
        root.style.setProperty("--train-tilt", `${Math.cos(runningPhase * 0.72) * movement * 0.028}deg`);
        root.style.setProperty("--coach-a-lift", `${Math.sin(runningPhase * 0.84) * movement * 0.7}px`);
        root.style.setProperty("--coach-b-lift", `${Math.sin(runningPhase * 0.84 + 1.1) * movement * 0.58}px`);
        root.style.setProperty("--tender-lift", `${Math.sin(runningPhase * 0.9 + 2.2) * movement * 0.48}px`);
        root.style.setProperty("--locomotive-lift", `${Math.sin(runningPhase * 0.94 + 2.8) * movement * 0.38}px`);

        // Wheel rotation is derived from accumulated rail travel rather than
        // CSS timing. Throttle changes therefore alter angular velocity without
        // restarting the animation or jumping the wheel phase.
        const railTravel = visualTravelRef.current * WHEEL_TRAVEL_CALIBRATION;
        const wheelAngle = (renderedRadius: number, speedRatio = 1) => {
          return (((railTravel * speedRatio) / (Math.PI * 2 * renderedRadius)) * 360) % 360;
        };
        const activeLayout = LOCOMOTIVE_RUNTIME_LAYOUTS[equippedEngineRef.current];
        const activeEngineId = equippedEngineRef.current;
        const runtimeRadii = activeLayout ? runtimeWheelRadiusRatios(activeEngineId, activeLayout) : null;
        const enginePixelWidth = ENGINE_RENDER_BASE_WIDTH * ((activeLayout?.totalWidth ?? 50) / 50);
        const layoutWidthRatio = (activeLayout?.totalWidth ?? 50) / 100;
        const driverRadius = enginePixelWidth * ((runtimeRadii?.driver ?? DRIVER_WHEEL_RADIUS_RATIO) / layoutWidthRatio);
        // Passenger coaches keep the same wheels regardless of equipped engine.
        const coachRadius = CAR_RENDER_WIDTH * .125 / 2;
        const tenderRadius = enginePixelWidth * ((runtimeRadii?.tender ?? SMALL_WHEEL_RADIUS_RATIO) / layoutWidthRatio);
        const smallWheelAngle = wheelAngle(coachRadius, CAR_WHEEL_SPEED_RATIO);
        const tenderWheelAngle = wheelAngle(tenderRadius, CAR_WHEEL_SPEED_RATIO);
        const driverWheelAngle = wheelAngle(driverRadius);
        const smallRadians = smallWheelAngle * (Math.PI / 180);
        const driverRadians = driverWheelAngle * (Math.PI / 180);
        // The clean driver face contains only the tire, spokes, and axle hub.
        // A separate crank pin and the coupling rod share this eccentric throw,
        // so no painted counterweight can flare around the wheel as it rotates.
        const driverCrankRadius = driverRadius * 0.404;
        const driverCrankPhase = 0;
        const smallCrankRadius = coachRadius * 0.67;
        const smallCrankPhase = -32.1 * (Math.PI / 180);
        root.style.setProperty("--small-wheel-angle", `${smallWheelAngle}deg`);
        root.style.setProperty("--tender-wheel-angle", `${tenderWheelAngle}deg`);
        root.style.setProperty("--driver-wheel-angle", `${driverWheelAngle}deg`);
        const frameDegrees = 360 / LOCOMOTIVE_SPRITE_ANIMATION.frames;
        const spriteRows = LOCOMOTIVE_SPRITE_ANIMATION.frames / LOCOMOTIVE_SPRITE_ANIMATION.columns;
        const locomotiveFrame = Math.floor(((driverWheelAngle + 360) % 360) / frameDegrees) % LOCOMOTIVE_SPRITE_ANIMATION.frames;
        root.style.setProperty("--engine-sprite-x", `${(locomotiveFrame % LOCOMOTIVE_SPRITE_ANIMATION.columns) * (100 / (LOCOMOTIVE_SPRITE_ANIMATION.columns - 1))}%`);
        root.style.setProperty("--engine-sprite-y", `${Math.floor(locomotiveFrame / LOCOMOTIVE_SPRITE_ANIMATION.columns) * (100 / (spriteRows - 1))}%`);
        [0, Math.PI / 2].forEach((phase, group) => {
          root.style.setProperty(`--rod-${group}-x`, `${Math.cos(driverRadians + driverCrankPhase + phase) * driverCrankRadius}px`);
          root.style.setProperty(`--rod-${group}-y`, `${Math.sin(driverRadians + driverCrankPhase + phase) * driverCrankRadius}px`);
        });
        CAR_TRUCK_PHASES.forEach((phaseOffset, index) => {
          const rodPhase = smallRadians + smallCrankPhase + phaseOffset * (Math.PI / 180);
          root.style.setProperty(`--car-rod-${index}-x`, `${Math.cos(rodPhase) * smallCrankRadius}px`);
          root.style.setProperty(`--car-rod-${index}-y`, `${Math.sin(rodPhase) * smallCrankRadius}px`);
        });
        Object.assign(exhaustMotionRef.current, {
          travel: railTravel, driverRadius, speed: velocity,
          load: throttleRef.current / 100, paused: pausedRef.current,
        });
        root.style.setProperty("--transition-haze", String(Math.sin(biomeMix * Math.PI) * 0.34));
        root.style.setProperty("--station-dwell", `${clamp(dwellRef.current.milliseconds / serviceDurationMilliseconds, 0, 1) * 100}%`);

        if (now - lastHudUpdate > 150) {
          setSpeed(speedRef.current);
          setBoilerLoad(boilerRef.current);
          setHeat(heatRef.current);
          setOverloaded(overloadRef.current);
          setBrakePressure(brakePressureRef.current);
          setGradePercent(gradeRef.current);
          setDistance(distanceRef.current);
          setSteamResources(steamResourcesRef.current);
          setBiomeState({ current: currentBiome, next: nextBiome, mix: biomeMix, tile: tileInBiome });
          setStationState({
            index: inStopZone ? stopStationIndex : nextStationIndex,
            distance: inStopZone ? Math.abs(stopStationDistance) : nextStationDistance,
            inZone: inStopZone,
            dwell: clamp(dwellRef.current.milliseconds / serviceDurationMilliseconds, 0, 1),
            collected: inStopZone ? stopCollected : claimedStopsRef.current.has(`${routeLoop}-${nextStationIndex}`),
          });
          lastHudUpdate = now;
        }
      }
      frame = requestAnimationFrame(renderMotion);
    };

    frame = requestAnimationFrame(renderMotion);
    return () => cancelAnimationFrame(frame);
  }, []);

  const soundWhistle = useCallback(() => {
    setWhistling(true);
    if (whistleTimer.current) clearTimeout(whistleTimer.current);
    whistleTimer.current = setTimeout(() => setWhistling(false), 1350);

    if (!settings.sound) return;
    try {
      const whistle = whistleAudioRef.current;
      if (!whistle) return;
      whistle.pause();
      whistle.currentTime = 0;
      void whistle.play().catch(() => undefined);
    } catch {
      // The visual whistle still fires when a browser blocks audio.
    }
  }, [settings.sound]);

  const commandThrottle = useCallback((value: number) => {
    const next = clamp(value, 0, 100);
    if (next > 0 && brakeRef.current) {
      brakeRef.current = false;
      setBrakeEngaged(false);
    }
    throttleRef.current = next;
    setThrottle(next);
  }, []);

  const brake = useCallback(() => {
    const nextEngaged = !brakeRef.current;
    brakeRef.current = nextEngaged;
    setBrakeEngaged(nextEngaged);
    if (nextEngaged) {
      throttleRef.current = 0;
      setThrottle(0);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (screen === "game") { setPaused(true); setScreen("options"); }
        else { setScreen("game"); setPaused(Boolean(runFailureRef.current)); }
        return;
      }
      if (screen !== "game") return;
      if (event.repeat && event.code === "Space") return;
      if (event.key.toLowerCase() === "w" || event.key === "ArrowUp") {
        event.preventDefault();
        commandThrottle(throttleRef.current + 6);
      }
      if (event.key.toLowerCase() === "s" || event.key === "ArrowDown") {
        event.preventDefault();
        if (event.repeat) return;
        brake();
      }
      if (event.code === "Space") {
        event.preventDefault();
        soundWhistle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [brake, commandThrottle, screen, soundWhistle]);

  useEffect(() => () => {
    if (whistleTimer.current) clearTimeout(whistleTimer.current);
    if (rewardTimer.current) clearTimeout(rewardTimer.current);
  }, []);

  const activeEngine = ACTIVE_LOCOMOTIVES.find((engine) => engine.id === equippedEngine) ?? ACTIVE_LOCOMOTIVES[0];
  const activeOperatingProfile = operatingProfileFor(activeEngine.id);
  const activeFactSheet = engineFactSheetFor(activeEngine.id);
  const activeConsistMetrics = calculateConsistMetrics(activeEngine.id, consistCars);
  const carWidth = CAR_RENDER_WIDTH;
  const activeRuntimeLayout = LOCOMOTIVE_RUNTIME_LAYOUTS[activeEngine.id];
  const engineWidth = ENGINE_RENDER_BASE_WIDTH * ((activeRuntimeLayout?.totalWidth ?? 50) / 50);
  const passengerWorldWidth = consistCars.length * carWidth;
  const trainWorldWidth = passengerWorldWidth + engineWidth;
  const trainAnchor = passengerWorldWidth / 2;
  const trainGeometry = calculateTrainSceneGeometry(viewportWidth, passengerWorldWidth, trainWorldWidth, cameraZoom);
  const cameraScale = trainGeometry.cameraScale;
  const sceneStyle: SceneStyle = {
    "--throttle-fill": `${throttle}%`,
    "--throttle-color": `hsl(${Math.round(118 - throttle * 1.12)} 78% 52%)`,
    "--brake-pressure": `${brakePressure * 100}%`,
    "--car-width": `${carWidth}px`,
    "--engine-left": `${consistCars.length * carWidth}px`,
    "--engine-width": `${engineWidth}px`,
    "--train-world-width": `${trainWorldWidth}px`,
    "--train-anchor": `${trainAnchor}px`,
    "--camera-scale": cameraScale,
    "--platform-width": `${trainGeometry.platformRenderedWidth}px`,
  };

  const motionState = overloaded ? "SAFETY LOCK" : brakeEngaged ? (speed > 0.5 ? "BRAKING" : "BRAKE SET") : paused ? "HOLDING" : speed < 2 ? "STOPPED" : speed > 67 ? "HIGHBALL" : "RUNNING TRUE";
  const activeBiome = BIOMES[biomeState.current];
  const nextBiome = BIOMES[biomeState.next];
  const activeStation = STATIONS[stationState.index];
  const onTarget = speed >= activeOperatingProfile.economicalSpeedMinMph && speed <= activeOperatingProfile.economicalSpeedMaxMph;
  const gradeLabel = `${gradePercent >= 0 ? "+" : ""}${gradePercent.toFixed(1)}%`;
  const heatState = overloaded ? "SAFETY LOCK" : heat >= 72 ? "HOT" : heat >= 30 ? "WARM" : "NORMAL";
  const heatTone = overloaded ? "locked" : heat >= 72 ? "hot" : heat >= 30 ? "warm" : "normal";
  const throttleState = brakeEngaged || throttle < 4
    ? "CLOSED"
    : throttle < 34
      ? "EASY STEAM"
      : throttle < 72
        ? "WORKING STEAM"
        : throttle < 92
          ? "STRONG STEAM"
          : "FULL STEAM";
  const stationDistanceYards = Math.max(0, Math.round(stationState.distance * 1.15));
  const servicing = stationState.inZone && speed < 2.5 && stationState.dwell > 0 && !stationState.collected;
  const openScreen = (next: typeof screen) => {
    setScreen(next);
    setPaused(next !== "game" || Boolean(runFailureRef.current));
  };
  const purchaseOrEquip = (engineId: string) => {
    const next = selectLocomotive({ bonds, ownedEngines, equippedEngine }, engineId);
    setBonds(next.bonds);
    setOwnedEngines(next.ownedEngines);
    setEquippedEngine(next.equippedEngine);
    setCameraZoom("auto");
  };
  const updateCar = (index: number, carId: string) => {
    setConsistCars((current) => current.map((existing, carIndex) => carIndex === index ? carId : existing));
  };
  const addCar = () => {
    setConsistCars((current) => current.length >= 6 ? current : [...current, "day-coach"]);
    setCameraZoom("auto");
  };
  const removeCar = () => {
    setConsistCars((current) => current.length <= 3 ? current : current.slice(0, -1));
    setCameraZoom("auto");
  };
  const restartRun = () => {
    const cleanResources = createSteamResourceState();
    steamResourcesRef.current = cleanResources;
    runFailureRef.current = null;
    lastPassedStationRef.current = -1;
    servicedStationRef.current = -1;
    claimedStopsRef.current.clear();
    dwellRef.current = { station: -1, milliseconds: 0 };
    visualTravelRef.current = 0;
    distanceRef.current = 0;
    speedRef.current = 0;
    boilerRef.current = 42;
    heatRef.current = 0;
    overloadRef.current = false;
    safetyLockRef.current = 0;
    brakePressureRef.current = 0;
    brakeRef.current = false;
    throttleRef.current = 42;
    setSteamResources(cleanResources);
    setRunFailure(null);
    setDistance(0);
    setSpeed(0);
    setBoilerLoad(42);
    setHeat(0);
    setOverloaded(false);
    setBrakePressure(0);
    setBrakeEngaged(false);
    setThrottle(42);
    setScreen("game");
    pausedRef.current = false;
    setPaused(false);
  };
  const failureCopy = runFailure === "water"
    ? { title: "Water exhausted", detail: "The boiler can no longer make safe steam. Refill sooner and keep the heat out of the red." }
    : runFailure === "fuel"
      ? activeFactSheet.fuelType === "oil"
        ? { title: "Oil exhausted", detail: "The burner has lost fuel pressure. Service the oil tender before the next departure." }
        : { title: "Coal exhausted", detail: "The fire has gone out. Use steadier steam and service the coal tender before the next departure." }
      : { title: "Service stop missed", detail: `Four stations passed without ${activeFactSheet.fuelType} and water service. The run has ended.` };

  return (
    <main ref={experienceRef} className={`experience phase-golden ${paused ? "is-paused" : ""} ${overloaded ? "is-overloaded" : ""} ${settings.reducedMotion ? "reduced-motion" : ""} ${settings.highContrast ? "high-contrast" : ""}`} style={sceneStyle}>
      <header className="topbar">
        <div className="brand" aria-label="Ironbound Unlimited">
          <span className="brand-mark" aria-hidden="true">IU</span>
          <span>
            <strong>IRONBOUND</strong>
            <small>UNLIMITED</small>
          </span>
        </div>
        <div className="area-title" aria-live="polite">
          <span>CURRENT AREA</span>
          <strong>{activeBiome.name}</strong>
        </div>
        <div className="top-actions">
          <span className="bond-balance"><b>{bonds.toLocaleString()}</b> BONDS</span>
          <button className="quiet-button" onClick={() => openScreen("shop")}>STORE</button>
          <button className="quiet-button" onClick={() => openScreen("options")}>OPTIONS</button>
        </div>
      </header>

      <section className="scene" aria-label={`Interactive steam train crossing ${activeBiome.name}`}>
        <div className="sky-glow" />
        <div className="route-strip" aria-hidden="true">
          {ROUTE_TILES.map((tile, index) => (
            <div
              key={tile.key}
              className={`route-tile biome-${tile.biome} tile-${tile.tile} ${index === 0 ? "first-tile" : ""}`}
            />
          ))}
        </div>
        <div className="biome-transition-haze" />
        <div className="atmosphere" />
        <div className="mid-scrub scrub-a" />
        <div className="mid-scrub scrub-b" />

        <div className={`station-layer ${servicing ? "is-servicing" : ""}`} aria-hidden="true">
          {STATIONS.map((station, index) => (
            <div key={station.name} className={`station-world station-${index} station-${station.art} ${servicing && stationState.index === index ? "service-active" : ""}`} data-station-index={index} data-station-name={station.name} data-service-active={servicing && stationState.index === index ? "true" : "false"}>
              <img
                className="station-platform-art"
                src={`/assets/station-${station.art === "river" ? "plains" : station.art}.webp`}
                alt=""
                draggable={false}
                decoding="async"
                loading={index === 0 ? "eager" : "lazy"}
              />
              <span className="station-service-activity" />
            </div>
          ))}
        </div>

        <div className={`train-wrap ${whistling ? "is-whistling" : ""} ${servicing ? "is-servicing" : ""}`}>
          <div className="train-kinetic">
            <div
              className="train-consist component-engine-consist"
              role="img"
              aria-label={`${activeEngine.name}, ${activeFactSheet.fuelType} tender, and ${consistCars.length} cars running on the railway`}
              data-car-count={consistCars.length}
              data-camera-mode={cameraZoom}
              data-camera-scale={cameraScale.toFixed(4)}
            >
              {consistCars.map((carId, carIndex) => {
                const car = carTypeFor(carId);
                const firstRod = carIndex * 2;
                return (
                  <div
                    key={`${carIndex}-${carId}`}
                    className={`rail-unit coach consist-car ${car.visualClass}`}
                    style={{ left: `${carIndex * carWidth}px`, width: `${carWidth}px`, "--car-lift": `var(--coach-${carIndex % 2 === 0 ? "a" : "b"}-lift, 0px)` } as SceneStyle}
                    data-passenger-car-index={carIndex}
                    aria-hidden="true"
                  >
                    {COACH_WHEEL_POSITIONS.map((position, wheelIndex) => (
                      <span key={position} className="running-wheel small-wheel" style={{ "--wheel-position": `${position}%`, "--wheel-phase": `${carIndex * 17 + (wheelIndex > 1 ? 34 : 0)}deg` } as SceneStyle}>
                        <img src="/assets/train-v3-truck-wheel.webp" alt="" draggable={false} decoding="async" />
                      </span>
                    ))}
                    {[0, 1].map((truck) => (
                      <span key={truck} className={`truck-rod coach-truck-rod truck-rod-${truck === 0 ? "a" : "b"}`} style={{ "--small-rod-x": `var(--car-rod-${firstRod + truck}-x)`, "--small-rod-y": `var(--car-rod-${firstRod + truck}-y)` } as SceneStyle}>
                        <img src="/assets/train-v3-coupling-rod.webp" alt="" draggable={false} decoding="async" />
                      </span>
                    ))}
                    <img className="component-body passenger-body" src={car.art} alt="" draggable={false} decoding="sync" fetchPriority={carIndex === 0 ? "high" : "auto"} />
                    <span className="car-mark">{car.shortName}</span>
                    <span className="coupler consist-coupler" />
                  </div>
                );
              })}

              <LocomotiveSprite engine={activeEngine} motion={exhaustMotionRef} />
            </div>
          </div>
        </div>

        <div className="track" aria-hidden="true">
          <div className="ballast" />
          <div className="sleepers" />
          <div className="rail rail-near" />
          <div className="rail rail-far" />
        </div>

        <div className="vignette" />

        <aside className="mission-card">
          <p>ACTIVE ORDER &nbsp;/&nbsp; WESTBOUND 01</p>
          <h1>{stationState.distance < 700 ? "Make the stop." : "Hold the line."}</h1>
          <div className="mission-rule" />
          <span className={onTarget ? "target-ok" : ""}>
            {stationState.distance < 700
              ? `BRAKE FOR ${activeStation.name.toUpperCase()}`
              : `${onTarget ? "TARGET SPEED LOCKED" : `HOLD ${activeOperatingProfile.economicalSpeedMinMph}–${activeOperatingProfile.economicalSpeedMaxMph} MPH`} • ${activeBiome.name}`}
          </span>
        </aside>

        <aside className={`station-card ${stationState.inZone ? "at-platform" : ""}`} aria-live="polite">
          <span className="eyebrow">{stationState.inZone ? "PLATFORM ZONE" : "NEXT REWARD STOP"}</span>
          <strong>{activeStation.name}</strong>
          {stationState.inZone ? (
            <small>{stationState.collected ? `Passengers aboard • ${activeFactSheet.fuelType} and water full` : speed < 2.5 ? `Boarding • water • ${activeFactSheet.fuelType} service` : "Brake below 3 MPH"}</small>
          ) : (
            <small className="station-distance"><b>{stationDistanceYards.toLocaleString()} YD</b><span>• {activeStation.reward}</span></small>
          )}
          {stationState.inZone && !stationState.collected && <div className="service-steps" aria-hidden="true"><span className={stationState.dwell > .05 ? "active" : ""}>BOARD</span><span className={stationState.dwell > .2 ? "active" : ""}>WATER</span><span className={stationState.dwell > .45 ? "active" : ""}>{activeFactSheet.fuelType.toUpperCase()}</span></div>}
          <div className="station-dwell"><i style={{ width: `${stationState.dwell * 100}%` }} /></div>
        </aside>

        <div className="right-hud">
          <aside className="speed-card">
            <span className="eyebrow">GROUND SPEED</span>
            <div className="speed-reading">
              <strong>{Math.round(speed).toString().padStart(2, "0")}</strong>
              <span>MPH</span>
            </div>
            <div className="status-line"><i />{motionState}</div>
            <small className="engine-limit">{activeEngine.name} • {Math.round(activeOperatingProfile.maximumSpeedMph * activeConsistMetrics.maximumSpeedFactor)} MPH loaded limit</small>
          </aside>

          <aside className="biome-card" aria-live="polite">
            <span className="eyebrow">TERRAIN</span>
            <strong>{activeBiome.name}</strong>
            <small>
              Tile {biomeState.tile + 1} of {TILES_PER_BIOME} • {biomeState.mix > 0.02 ? `Blending into ${nextBiome.name}` : `Next: ${nextBiome.name}`}
            </small>
            <div><i style={{ width: `${Math.max(2, biomeState.mix * 100)}%` }} /></div>
          </aside>

          <aside className="zoom-card" aria-label="Camera zoom">
            <span className="eyebrow">CAMERA</span>
            <div>
              {(["auto", "close", "standard", "wide"] as const).map((zoom) => (
                <button key={zoom} className={cameraZoom === zoom ? "active" : ""} onClick={() => setCameraZoom(zoom)}>{zoom === "auto" ? "↔" : zoom === "close" ? "+" : zoom === "wide" ? "−" : "•"}<small>{zoom}</small></button>
              ))}
            </div>
          </aside>
        </div>

        {rewardNotice && (
          <div className="reward-notice" role="status">
            <span>STATION CLEARED</span>
            <strong>{rewardNotice.station}</strong>
            <p>+ {rewardNotice.reward}</p>
            {rewardNotice.service && <small>{rewardNotice.service}</small>}
            {rewardNotice.bonus && <small>{rewardNotice.bonus}</small>}
          </div>
        )}

        {runFailure && (
          <div className="run-failure" role="alertdialog" aria-modal="true" aria-labelledby="run-failure-title">
            <span>RUN ENDED</span>
            <h2 id="run-failure-title">{failureCopy.title}</h2>
            <p>{failureCopy.detail}</p>
            <button onClick={restartRun}>START NEW RUN</button>
          </div>
        )}
      </section>

      <section className="cab" id="cab" aria-label="Locomotive controls">
        <div className="telemetry-group">
          <span className="eyebrow">{activeEngine.name.toUpperCase()} • STEAM PLANT</span>
          <div className="telemetry-grid">
            <div className={boilerLoad >= 90 ? "boiler-hot" : ""}><small>BOILER</small><strong>{Math.round(boilerLoad)}%</strong></div>
            <div><small>GRADE</small><strong>{gradeLabel}</strong></div>
            <div><small>TRAIN</small><strong>{Math.round(activeConsistMetrics.totalTrainTons)} T</strong></div>
            <div><small>LOADED LIMIT</small><strong>{Math.round(activeOperatingProfile.maximumSpeedMph * activeConsistMetrics.maximumSpeedFactor)} MPH</strong></div>
            <div><small>DIST</small><strong>{distance.toFixed(1)} MI</strong></div>
          </div>
          <div className="resource-monitors">
            <div className={steamResources.fuel < 25 ? "resource-low" : ""} role="meter" aria-label={`${activeFactSheet.fuelType} remaining`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(steamResources.fuel)}><span><small>{activeFactSheet.fuelType.toUpperCase()}</small><strong>{Math.round(activeOperatingProfile.fuelCapacity * steamResources.fuel / 100).toLocaleString()} {activeOperatingProfile.fuelCapacityUnit}</strong></span><i><b style={{ width: `${steamResources.fuel}%` }} /></i></div>
            <div className={steamResources.water < 25 ? "resource-low" : ""} role="meter" aria-label="Water remaining" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(steamResources.water)}><span><small>WATER</small><strong>{Math.round(activeOperatingProfile.waterCapacityGallons * steamResources.water / 100).toLocaleString()} gal</strong></span><i><b style={{ width: `${steamResources.water}%` }} /></i></div>
            <div className={stationsUntilServiceRequired(steamResources) <= 1 ? "service-warning" : ""}><span><small>SERVICE DUE</small><strong>{stationsUntilServiceRequired(steamResources)} STATIONS</strong></span></div>
          </div>
          <div
            className={`heat-monitor heat-${heatTone}`}
            role="meter"
            aria-label="Engine heat"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(heat)}
          >
            <span><small>ENGINE HEAT</small><strong>{heatState}</strong></span>
            <div><i style={{ width: `${heat}%` }} /></div>
          </div>
        </div>

        <div className="throttle-control">
          <div className="regulator-console">
            <label className={`regulator-slider ${throttle >= 82 ? "is-high" : ""}`} htmlFor="throttle">
              <span className="regulator-rail" aria-hidden="true">
                <i className="regulator-live" />
                <i className="regulator-glow" />
              </span>
              <input
                className="regulator-input"
                id="throttle"
                type="range"
                min="0"
                max="100"
                value={throttle}
                aria-label="Locomotive throttle"
                aria-valuetext={throttleState}
                onChange={(event) => commandThrottle(Number(event.target.value))}
              />
            </label>
          </div>
          <div className="control-buttons">
            <button className="whistle-button" onClick={soundWhistle}><strong>WHISTLE</strong></button>
            <button
              className={`brake-button ${brakeEngaged ? "is-set" : ""}`}
              aria-label={brakeEngaged ? "Release train brake" : "Apply train brake"}
              aria-pressed={brakeEngaged}
              onClick={brake}
            ><strong>BRAKE</strong></button>
          </div>
        </div>
      </section>

      {screen !== "game" && (
        <div className={`game-shell shell-${screen}`} role="dialog" aria-modal="true" aria-label={screen === "intro" ? "Main menu" : screen}
          onClick={(event) => {
            if (screen === "shop" && event.target === event.currentTarget) openScreen("game");
          }}>
          {screen === "intro" && (
            <section className="intro-panel">
              <div className="intro-locomotive" aria-hidden="true"><LocomotiveSprite engine={activeEngine} mode="preview" /></div>
              <h1>IRONBOUND <em>UNLIMITED</em></h1>
              <p>Run a historically grounded steam railway. Build the consist, manage fuel and water, and berth every carriage at the platform.</p>
              <div className="menu-actions">
                <button className="primary-menu-button" onClick={() => openScreen("game")}>BEGIN RUN</button>
                <button onClick={() => openScreen("shop")}>OPEN STORE</button>
                <button onClick={() => openScreen("options")}>SETTINGS & OPTIONS</button>
              </div>
              <small>W / ↑ throttle &nbsp;•&nbsp; S / ↓ brake &nbsp;•&nbsp; Space whistle &nbsp;•&nbsp; Esc menu</small>
            </section>
          )}

          {screen === "shop" && (
            <section className="menu-panel shop-panel">
              <header className="menu-panel-header">
                <div><span className="menu-kicker">IRONBOUND COMMISSARY</span><h2>Store</h2><p>{FLEET_REVIEW_UNLOCKED ? `Review access is active for all ${ACTIVE_LOCOMOTIVES.length} locomotives.` : "Build the railway deliberately: engines, rolling stock, and sound belong in one place."}</p></div>
                <div className="shop-balance"><small>AVAILABLE</small><strong>{bonds.toLocaleString()}</strong><span>BONDS</span></div>
                <button className="menu-close" onClick={() => openScreen("game")} aria-label="Return to railway">×</button>
              </header>
              <nav className="store-tabs" aria-label="Store departments">
                <button className={storeTab === "engines" ? "active" : ""} aria-pressed={storeTab === "engines"} onClick={() => setStoreTab("engines")}>ENGINES</button>
                <button className={storeTab === "carriages" ? "active" : ""} aria-pressed={storeTab === "carriages"} onClick={() => setStoreTab("carriages")}>CARRIAGES</button>
                <button className={storeTab === "audio" ? "active" : ""} aria-pressed={storeTab === "audio"} onClick={() => setStoreTab("audio")}>AUDIO PACKS</button>
              </nav>

              {storeTab === "engines" && <div className="engine-grid">
                {ACTIVE_LOCOMOTIVES.map((engine) => {
                  const available = canEquipLocomotive(engine.id, ownedEngines);
                  const equipped = equippedEngine === engine.id;
                  const affordable = bonds >= engine.cost;
                  const profile = operatingProfileFor(engine.id);
                  const fact = engineFactSheetFor(engine.id);
                  return (
                    <article key={engine.id} className={`engine-card ${equipped ? "equipped" : ""} ${!available && !affordable ? "locked" : ""}`}>
                      <div className="engine-preview">
                        <LocomotiveSprite engine={engine} mode="preview" />
                        <span className="wheel-arrangement-badge">{engine.wheelArrangement}</span>
                      </div>
                      <div className="engine-card-copy">
                        <small>{engine.tier} • {engine.road}</small><h3>{engine.name}</h3>
                        <p><b>{profile.maximumSpeedMph} MPH</b> modeled limit • {profile.cruiseSpeedMph} MPH cruise</p><p><b>×{engine.bondMultiplier}</b> Bond payout</p>
                        <details className="engine-fact-sheet">
                          <summary>FACT SHEET</summary>
                          <p>{fact.summary}</p>
                          <dl>
                            <div><dt>Builder / year</dt><dd>{fact.builder}, {fact.builtYear}</dd></div>
                            <div><dt>Class / wheels</dt><dd>{fact.className}, {fact.wheelArrangement}</dd></div>
                            <div><dt>Drivers</dt><dd>{fact.driverDiameterInches} in</dd></div>
                            <div><dt>Modeled engine + tender</dt><dd>{fact.engineAndTenderTons.toLocaleString()} tons</dd></div>
                            <div><dt>Tractive effort</dt><dd>{fact.tractiveEffortLbf.toLocaleString()} lbf</dd></div>
                            <div><dt>Fuel / water</dt><dd>{fact.fuelCapacityLabel} / {fact.waterCapacityGallons.toLocaleString()} gal</dd></div>
                            <div><dt>Throttle response</dt><dd>{Math.round(profile.throttleResponseFactor * 100)}% of fleet reference</dd></div>
                            <div><dt>Adhesion</dt><dd>{Math.round(profile.adhesionFactor * 100)}% modeled factor</dd></div>
                            <div><dt>Steaming capacity</dt><dd>{Math.round(profile.steamingCapacityFactor * 100)}% modeled factor</dd></div>
                            <div><dt>Brake rigging</dt><dd>{Math.round(profile.brakeRiggingFactor * 100)}% modeled factor</dd></div>
                            <div><dt>Status</dt><dd>{fact.status}</dd></div>
                          </dl>
                          <a href={fact.sourceUrl} target="_blank" rel="noreferrer">SOURCE / DESIGN REFERENCE ↗</a>
                          {fact.accuracy !== "documented" && <em>Design proxy — not presented as a historical identity.</em>}
                        </details>
                        {engine.note && <em>{engine.note}</em>}
                      </div>
                      <button disabled={!available && !affordable} onClick={() => purchaseOrEquip(engine.id)}>{equipped ? "IN SERVICE" : available ? "EQUIP" : `${engine.cost.toLocaleString()} BONDS`}</button>
                    </article>
                  );
                })}
              </div>}

              {storeTab === "carriages" && <section className="store-department" aria-labelledby="carriage-store-heading">
                <div className="department-heading"><div><span className="menu-kicker">IRONBOUND YARD</span><h3 id="carriage-store-heading">Build Your Train</h3><p>Every added car increases resource use, acceleration time, stopping distance, and lowers the loaded speed ceiling.</p></div><div className="consist-summary"><small>LOADED TRAIN</small><strong>{Math.round(activeConsistMetrics.totalTrainTons)}</strong><span>TONS</span></div></div>
                <div className="consist-toolbar"><button onClick={removeCar} disabled={consistCars.length <= 3}>REMOVE LAST CAR</button><strong>{consistCars.length} CARS</strong><button onClick={addCar} disabled={consistCars.length >= 6}>ADD CAR</button></div>
                <div className="consist-list">
                  {consistCars.map((carId, index) => {
                    const selectedCar = carTypeFor(carId);
                    return <article key={index} className={selectedCar.visualClass}>
                      <div className="consist-car-preview"><img src={selectedCar.art} alt="" draggable={false} /><span>{index + 1}</span></div>
                      <label htmlFor={`car-${index}`}><small>CAR {index + 1}</small><strong>{selectedCar.name}</strong></label>
                      <select id={`car-${index}`} value={carId} onChange={(event) => updateCar(index, event.target.value)}>{CONSIST_CAR_TYPES.map((car) => <option key={car.id} value={car.id}>{car.name}</option>)}</select>
                      <p>{selectedCar.loadedTons} loaded tons • {selectedCar.capacity}</p>
                    </article>;
                  })}
                </div>
                <footer className="consist-footer"><span><b>{Math.round(activeOperatingProfile.maximumSpeedMph * activeConsistMetrics.maximumSpeedFactor)} MPH</b> loaded limit</span><span><b>{activeConsistMetrics.brakeResponseFactor.toFixed(2)}×</b> brake demand</span><span><b>{stationsUntilServiceRequired(steamResources)}</b> stations to service</span><button className="primary-menu-button" onClick={() => openScreen("game")}>TAKE THIS TRAIN</button></footer>
              </section>}

              {storeTab === "audio" && <section className="store-department audio-packs" aria-labelledby="audio-store-heading">
                <div className="department-heading"><div><span className="menu-kicker">SOUND CABINET</span><h3 id="audio-store-heading">Audio Packs</h3><p>Sound packs change railway atmosphere without changing engine performance.</p></div></div>
                <article className="audio-pack installed"><span>INSTALLED</span><h4>Heritage Steam</h4><p>The working Ironbound steam whistle, balanced for cab controls and reduced-motion play.</p><button disabled>IN SERVICE</button></article>
                <article className="audio-pack"><span>IN PRODUCTION</span><h4>Mountain Echo</h4><p>Long-valley reverberation, grade-working exhaust, rail joints, and station ambience.</p><button disabled>COMING SOON</button></article>
                <article className="audio-pack"><span>IN PRODUCTION</span><h4>Winter Limited</h4><p>Cold-start steam, snow-muted running gear, bells, and platform atmosphere.</p><button disabled>COMING SOON</button></article>
              </section>}
            </section>
          )}

          {screen === "options" && (
            <section className="menu-panel options-panel">
              <header className="menu-panel-header"><div><span className="menu-kicker">CAB CONFIGURATION</span><h2>Settings & Options</h2><p>Changes save automatically on this device.</p></div><button className="menu-close" onClick={() => openScreen("game")} aria-label="Return to railway">×</button></header>
              <div className="options-list">
                <label><span><b>Sound effects</b><small>Whistle and railway audio</small></span><input type="checkbox" checked={settings.sound} onChange={(event) => setSettings((current) => ({ ...current, sound: event.target.checked }))} /></label>
                <label><span><b>Reduced motion</b><small>Removes cab and locomotive bobbing</small></span><input type="checkbox" checked={settings.reducedMotion} onChange={(event) => setSettings((current) => ({ ...current, reducedMotion: event.target.checked }))} /></label>
                <label><span><b>High contrast</b><small>Strengthens panels and interface edges</small></span><input type="checkbox" checked={settings.highContrast} onChange={(event) => setSettings((current) => ({ ...current, highContrast: event.target.checked }))} /></label>
                <label className="scale-option"><span><b>Interface size</b><small>{settings.uiScale}%</small></span><input type="range" min="90" max="120" step="5" value={settings.uiScale} onChange={(event) => setSettings((current) => ({ ...current, uiScale: Number(event.target.value) }))} /></label>
              </div>
              <div className="current-engine"><span>ENGINE IN SERVICE</span><strong>{activeEngine.name}</strong><small>{activeEngine.wheelArrangement} • ×{activeEngine.bondMultiplier} bonds</small></div>
              <div className="options-actions"><button onClick={() => openScreen("intro")}>MAIN MENU</button><button className="primary-menu-button" onClick={() => openScreen("game")}>RETURN TO RUN</button></div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
