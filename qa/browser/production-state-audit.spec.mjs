import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { expect, test } from "@playwright/test";

const AUDIT_ROOT = "qa-artifacts/production-state-audit";
const DESKTOP = { width: 1440, height: 900 };
const GAME = { width: 1365, height: 768 };
const COMPACT = { width: 932, height: 430 };
const PORTRAIT = { width: 430, height: 932 };

const FLEET = [
  ["tom-thumb", "Ironbound No. 1"],
  ["southern-4501", "Southern Railway No. 4501"],
  ["prr-1361", "PRR K4s No. 1361"],
  ["nkp-765", "Nickel Plate Road No. 765"],
  ["atsf-3751", "Santa Fe No. 3751"],
  ["nw-611", "Norfolk & Western No. 611"],
  ["up-844", "Union Pacific No. 844"],
  ["nw-1218", "Norfolk & Western No. 1218"],
  ["challenger-3985", "Union Pacific Challenger No. 3985"],
  ["big-boy-4014", "Union Pacific Big Boy No. 4014"],
  ["the-flyer-1907", "The Flyer, 1907 No. 222"],
  ["polar-express-1225", "Polar Express No. 1225"],
];

const STATIONS = [
  [0, "Cinder Flats", "High Plains"],
  [1, "Copper Wash", "Red Mesa"],
  [2, "Saltworks", "Salt Flats"],
  [3, "Timberline", "Pine Divide"],
  [4, "Summit House", "Alpine Pass"],
  [5, "Stillwater", "River Basin"],
];

const captured = [];

async function waitForVisuals(page) {
  await expect(page.locator(".experience")).toHaveAttribute("data-app-ready", "true", { timeout: 10_000 });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  await page.evaluate(async () => { await document.fonts?.ready; });
  await page.waitForTimeout(120);
}

async function setRangeValue(locator, value) {
  await locator.evaluate((element, nextValue) => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!valueSetter) throw new Error("HTMLInputElement.value setter is unavailable");
    valueSetter.call(element, String(nextValue));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function capture(page, state, options = {}) {
  const relativePath = `${state.id}.png`;
  const outputPath = join(AUDIT_ROOT, relativePath);
  await mkdir(dirname(outputPath), { recursive: true });
  await waitForVisuals(page);
  await page.screenshot({
    path: outputPath,
    fullPage: options.fullPage ?? false,
    animations: options.animations ?? "disabled",
    caret: "hide",
  });
  captured.push({
    ...state,
    file: relativePath,
    viewport: page.viewportSize(),
    url: page.url(),
  });
}

async function openQaGame(page, query, viewport = GAME) {
  await page.setViewportSize(viewport);
  await page.goto(`/?${query}`);
  await expect(page.locator("#cab")).toBeVisible();
  await waitForVisuals(page);
}

async function waitForStation(page, stationIndex) {
  const station = page.locator(`.station-world[data-station-index="${stationIndex}"]`);
  await expect.poll(async () => station.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const opacity = Number(getComputedStyle(element).opacity);
    const stationCenter = box.left + box.width / 2;
    return opacity >= .94 && Math.abs(stationCenter - window.innerWidth * .40) <= 3;
  }), { timeout: 10_000, message: `station ${stationIndex} must be fully staged` }).toBe(true);
  await expect(page.locator(".station-card")).toHaveClass(/at-platform/);
}

async function clickZoom(page, name) {
  const control = page.locator(".zoom-card button").filter({ hasText: name });
  await control.click();
  await expect(control).toHaveClass(/active/);
  await page.waitForTimeout(120);
}

test("capture every production-review visual state", async ({ page }) => {
  test.setTimeout(300_000);
  await mkdir(AUDIT_ROOT, { recursive: true });

  // Navigation and top-level product screens.
  await page.setViewportSize(DESKTOP);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /IRONBOUND/i })).toBeVisible();
  await capture(page, {
    id: "01-navigation/01-intro-main-menu",
    category: "Navigation",
    title: "Main menu",
    purpose: "First-launch identity, title balance, and primary entry points without redundant locomotive artwork.",
  });

  await page.getByRole("button", { name: "BEGIN RUN" }).click();
  await expect(page.locator("#cab")).toBeVisible();
  await capture(page, {
    id: "01-navigation/02-game-idle-brake-set",
    category: "Navigation",
    title: "Railway idle, brake set",
    purpose: "Default playable scene immediately after entering a run.",
  });

  await page.getByRole("button", { name: "STORE" }).click();
  await expect(page.getByRole("button", { name: "CARRIAGES" })).toBeVisible();
  await capture(page, {
    id: "01-navigation/03-store-engines-top",
    category: "Navigation",
    title: "Store — engines, top",
    purpose: "Progression roster, current engine, pricing, and first-row locomotive presentation.",
  });
  const shopPanel = page.locator(".shop-panel");
  await shopPanel.evaluate((element) => element.scrollTo({ top: element.scrollHeight, behavior: "instant" }));
  await capture(page, {
    id: "01-navigation/04-store-engines-bottom",
    category: "Navigation",
    title: "Store — engines, bottom",
    purpose: "Late-tier locomotive presentation and progression lock treatment.",
  });
  await shopPanel.evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));

  await page.getByRole("button", { name: "CARRIAGES" }).click();
  const addCar = page.getByRole("button", { name: "ADD CAR" });
  for (let index = 0; index < 3; index += 1) {
    if (await addCar.isEnabled()) await addCar.click();
  }
  await expect(page.locator(".consist-list article")).toHaveCount(6);
  await capture(page, {
    id: "01-navigation/05-store-carriages-six-car",
    category: "Navigation",
    title: "Store — six-car consist",
    purpose: "Maximum player consist, carriage identity, weight summary, and editor density.",
  });
  await shopPanel.evaluate((element) => element.scrollTo({ top: element.scrollHeight, behavior: "instant" }));
  await capture(page, {
    id: "01-navigation/06-store-carriages-bottom",
    category: "Navigation",
    title: "Store — six-car consist, lower editor",
    purpose: "Lower consist rows, loaded limit, brake demand, and take-train action.",
  });
  await shopPanel.evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));

  await page.getByRole("button", { name: "AUDIO PACKS" }).click();
  await expect(page.getByRole("heading", { name: "Audio Packs" })).toBeVisible();
  await capture(page, {
    id: "01-navigation/07-store-audio-packs",
    category: "Navigation",
    title: "Store — audio packs",
    purpose: "All selectable soundscape packs and analogue/provenance disclosure.",
  });

  await page.getByRole("button", { name: "Return to railway" }).click();
  await page.getByRole("button", { name: "OPTIONS" }).click();
  const optionsPanel = page.locator(".options-panel");
  await expect(page.getByRole("heading", { name: "Settings & Options" })).toBeVisible();
  await expect(optionsPanel).toBeVisible();
  await expect.poll(async () => optionsPanel.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      opacity: Number(style.opacity),
      width: Math.round(box.width),
      height: Math.round(box.height),
      centerOffset: Math.round(Math.abs((box.left + box.width / 2) - window.innerWidth / 2)),
    };
  }), {
    timeout: 4_000,
    message: "Options panel must be fully painted and centered before production evidence is captured",
  }).toMatchObject({
    opacity: 1,
    width: expect.any(Number),
    height: expect.any(Number),
    centerOffset: expect.any(Number),
  });
  const optionsPaint = await optionsPanel.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      width: box.width,
      height: box.height,
      centerOffset: Math.abs((box.left + box.width / 2) - window.innerWidth / 2),
      backgroundImage: style.backgroundImage,
      borderTopWidth: style.borderTopWidth,
    };
  });
  expect(optionsPaint.width).toBeGreaterThan(520);
  expect(optionsPaint.height).toBeGreaterThan(430);
  expect(optionsPaint.centerOffset).toBeLessThan(4);
  expect(optionsPaint.backgroundImage).not.toBe("none");
  expect(Number.parseFloat(optionsPaint.borderTopWidth)).toBeGreaterThan(0);
  await page.waitForTimeout(420);
  await capture(page, {
    id: "01-navigation/08-options-default",
    category: "Navigation",
    title: "Settings and options",
    purpose: "Accessibility, sound, motion, contrast, interface sizing, and return actions.",
  }, { animations: "allow" });

  const contrastToggle = page.locator(".options-list label").filter({ hasText: "High contrast" }).locator('input[type="checkbox"]');
  await contrastToggle.check();
  await page.getByRole("button", { name: "RETURN TO RUN" }).click();
  await capture(page, {
    id: "01-navigation/09-game-high-contrast",
    category: "Accessibility",
    title: "High-contrast railway",
    purpose: "Production contrast mode applied to the live driving scene.",
  });

  // Camera and consist composition states.
  await openQaGame(page, "qaEngine=tom-thumb&qaCars=3");
  for (const camera of ["auto", "close", "standard", "wide"]) {
    await clickZoom(page, camera);
    await capture(page, {
      id: `02-camera/${camera}-three-car`,
      category: "Camera",
      title: `${camera} camera — three-car consist`,
      purpose: "Camera framing and track/train readability with the starter consist.",
    });
  }
  await openQaGame(page, "qaEngine=tom-thumb&qaCars=6");
  await capture(page, {
    id: "02-camera/auto-six-car",
    category: "Camera",
    title: "Auto camera — six-car consist",
    purpose: "Automatic framing at maximum consist length.",
  });

  // Every locomotive rendered in the same live-scene conditions.
  for (const [engineId, engineName] of FLEET) {
    await openQaGame(page, `qaEngine=${engineId}&qaCars=3&qaStation=0`);
    await waitForStation(page, 0);
    await capture(page, {
      id: `03-fleet/${engineId}`,
      category: "Fleet",
      title: engineName,
      purpose: "Runtime silhouette, scale, rail contact, tender gap, wheels, and cab clearance under a common composition.",
    });
  }

  // Every route/station environment at the same operational point.
  for (const [stationIndex, stationName, biomeName] of STATIONS) {
    await openQaGame(page, `qaEngine=tom-thumb&qaCars=3&qaStation=${stationIndex}`);
    await waitForStation(page, stationIndex);
    const stagedDistanceText = await page.locator(".telemetry-grid > div").filter({ hasText: /^DIST/ }).locator("strong").textContent();
    const stagedRunMiles = Number.parseFloat(stagedDistanceText ?? "NaN");
    expect(Number.isFinite(stagedRunMiles), `${stationName} must expose a finite run odometer`).toBe(true);
    expect(stagedRunMiles, `${stationName} QA staging must not leak raw route coordinates into miles`).toBeLessThan(10);
    await capture(page, {
      id: `04-route/${String(stationIndex + 1).padStart(2, "0")}-${stationName.toLowerCase().replaceAll(" ", "-")}`,
      category: "Route",
      title: `${stationName} — ${biomeName}`,
      purpose: "Station art, environment continuity, platform relationship, signage, plausible run mileage, and HUD state for this route region.",
    });
  }

  // Live operating states.
  await openQaGame(page, "qaEngine=southern-4501&qaCars=3");
  const releaseBrake = page.getByRole("button", { name: "Release train brake" });
  await releaseBrake.click();
  await setRangeValue(page.locator("#throttle"), 64);
  await expect.poll(async () => Number((await page.locator(".speed-card .speed-reading strong").textContent()) ?? 0), {
    timeout: 12_000,
  }).toBeGreaterThanOrEqual(12);
  await capture(page, {
    id: "05-operation/01-cruise-under-steam",
    category: "Operation",
    title: "Cruise under steam",
    purpose: "Moving locomotive, active regulator, exhaust, speed display, and unobstructed running composition.",
  }, { animations: "allow" });

  await page.getByRole("button", { name: "Apply train brake" }).click();
  await page.waitForTimeout(260);
  await capture(page, {
    id: "05-operation/02-service-braking",
    category: "Operation",
    title: "Service braking",
    purpose: "Brake-command state while the train is still moving and brake pressure is building.",
  }, { animations: "allow" });

  await openQaGame(page, "qaEngine=southern-4501&qaCars=3&qaStation=4");
  await page.getByRole("button", { name: "Release train brake" }).click();
  await setRangeValue(page.locator("#throttle"), 78);
  await expect.poll(async () => page.locator('[data-engine-sprite="southern-4501"]').getAttribute("data-sanding"), {
    timeout: 8_000,
  }).toBe("true");
  await capture(page, {
    id: "05-operation/03-uphill-launch-automatic-sanding",
    category: "Operation",
    title: "Uphill launch with automatic sanding",
    purpose: "Low-speed adhesion aid, cylinder-clearing/exhaust cues, and uphill launch readability.",
  }, { animations: "allow" });

  await openQaGame(page, "qaEngine=tom-thumb&qaCars=3");
  await page.getByRole("button", { name: "WHISTLE" }).click();
  await page.waitForTimeout(100);
  await capture(page, {
    id: "05-operation/04-whistle-active",
    category: "Operation",
    title: "Whistle active",
    purpose: "Short-lived whistle control feedback and steam cue.",
  }, { animations: "allow" });

  await openQaGame(page, "qaEngine=tom-thumb&qaCars=6&qaStation=0&qaService=active");
  await waitForStation(page, 0);
  await expect(page.locator('.station-world[data-station-index="0"]')).toHaveAttribute("data-service-active", "true", { timeout: 8_000 });
  await capture(page, {
    id: "05-operation/05-station-service-active",
    category: "Operation",
    title: "Station service active",
    purpose: "Stopped six-car train, service art, resource refill state, and platform berth.",
  }, { animations: "allow" });
  await expect(page.locator(".reward-notice")).toBeVisible({ timeout: 15_000 });
  await capture(page, {
    id: "05-operation/06-station-cleared-reward",
    category: "Operation",
    title: "Station cleared reward",
    purpose: "Completion feedback, reward hierarchy, and post-service messaging.",
  });

  // Terminal run states. All three are distinct player-facing outcomes.
  for (const failure of ["fuel", "water", "service"]) {
    await openQaGame(page, `qaEngine=tom-thumb&qaCars=3&qaFailure=${failure}`);
    await expect(page.locator(".run-failure")).toBeVisible();
    await capture(page, {
      id: `06-failure/${failure}`,
      category: "Failure",
      title: `${failure} failure`,
      purpose: "Run-ending modal, failure explanation, recovery action, and background legibility.",
    });
  }

  // Lifted safety-valve / overheat presentation restored from a valid save state.
  await page.setViewportSize(GAME);
  await page.addInitScript(() => {
    localStorage.setItem("ironbound-save-v4", JSON.stringify({
      bonds: 0,
      ownedEngines: ["tom-thumb"],
      equippedEngine: "tom-thumb",
      consistCars: ["pullman", "day-coach", "baggage-mail"],
      cameraZoom: "auto",
      settings: { sound: false, reducedMotion: false, highContrast: false, uiScale: 100 },
      run: {
        throttle: 100,
        speed: 30,
        boilerLoad: 100,
        heat: 100,
        distance: 0,
        visualTravel: 0,
        brakeEngaged: false,
        fuel: 100,
        water: 100,
        stationsWithoutService: 0,
        failure: null,
      },
    }));
  });
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN RUN" }).click();
  await expect(page.locator(".experience")).toHaveClass(/is-overloaded/, { timeout: 8_000 });
  await capture(page, {
    id: "07-safety/safety-valves-lifted",
    category: "Safety",
    title: "Safety valves lifted",
    purpose: "Heat warning, lifted safety-valve state, relief steam cue, and high-demand telemetry.",
  }, { animations: "allow" });

  // Responsive layouts: compact landscape is supported; portrait is captured
  // exactly as the current build behaves so regressions cannot hide behind assumptions.
  await openQaGame(page, "qaEngine=tom-thumb&qaCars=3", COMPACT);
  await capture(page, {
    id: "08-responsive/compact-landscape-932x430",
    category: "Responsive",
    title: "Compact landscape 932×430",
    purpose: "Short-screen cab fit, starter locomotive clearance, and retained essential instructions.",
  });

  await openQaGame(page, "qaEngine=tom-thumb&qaCars=3", PORTRAIT);
  await capture(page, {
    id: "08-responsive/portrait-430x932-current-behavior",
    category: "Responsive",
    title: "Portrait 430×932 — current behavior",
    purpose: "Objective capture of the current unsupported-or-supported portrait behavior for production review.",
  });

  await writeFile(join(AUDIT_ROOT, "manifest.json"), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    sourceCommit: process.env.GITHUB_SHA ?? null,
    screenshotCount: captured.length,
    states: captured,
  }, null, 2)}\n`, "utf8");

  expect(captured.length).toBeGreaterThanOrEqual(40);
});
