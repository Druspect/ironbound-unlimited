import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const ROOT = "qa-artifacts/production-state-audit";
const DESKTOP = { width: 1365, height: 768 };
const STATION_TRAVEL = [943, 6693, 12443, 18193, 23943, 29693];
const BIOME_TRAVEL = [1200, 6900, 12650, 18400, 24150, 29900];

const manifest = [];

async function waitForVisualReady(page) {
  await expect(page.locator(".experience")).toBeVisible();
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  await page.evaluate(async () => { await document.fonts?.ready; });
  await page.waitForTimeout(180);
}

async function capture(page, folder, name, title, defense, checks = []) {
  const directory = path.join(ROOT, folder);
  await mkdir(directory, { recursive: true });
  const relative = `${folder}/${name}.png`;
  await page.screenshot({
    path: path.join(ROOT, relative),
    fullPage: false,
    animations: "disabled",
    caret: "hide",
  });
  manifest.push({ file: relative, title, defense, checks, viewport: page.viewportSize() });
}

async function cleanStart(page, viewport = DESKTOP) {
  await page.setViewportSize(viewport);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForVisualReady(page);
}

async function setRangeValue(locator, value) {
  await locator.evaluate((element, nextValue) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("range setter unavailable");
    setter.call(element, String(nextValue));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function openFreshGame(page, viewport = DESKTOP) {
  await cleanStart(page, viewport);
  await page.getByRole("button", { name: "BEGIN RUN" }).click();
  await expect(page.locator("#cab")).toBeVisible();
  await page.waitForTimeout(220);
}

async function seedSavedRun(page, run, settings = undefined, viewport = DESKTOP) {
  await page.setViewportSize(viewport);
  await page.goto("/");
  await page.evaluate(({ runState, savedSettings }) => {
    localStorage.clear();
    localStorage.setItem("ironbound-save-v4", JSON.stringify({
      ...(savedSettings ? { settings: savedSettings } : {}),
      run: {
        throttle: 0,
        speed: 0,
        boilerLoad: 42,
        heat: 0,
        distance: 0,
        visualTravel: 0,
        brakeEngaged: true,
        fuel: 100,
        water: 100,
        stationsWithoutService: 0,
        failure: null,
        claimedStops: [],
        servicedStationSequence: -1,
        ...runState,
      },
    }));
  }, { runState: run, savedSettings: settings });
  await page.reload();
  await waitForVisualReady(page);
  await page.getByRole("button", { name: "BEGIN RUN" }).click();
  await expect(page.locator("#cab")).toBeVisible();
  await page.waitForTimeout(260);
}

test("capture every production-facing visual state", async ({ page }) => {
  test.setTimeout(180_000);

  // 01 — Primary navigation surfaces.
  await cleanStart(page);
  await capture(page, "01-primary-screens", "01-main-menu", "Main menu", "The entry surface establishes the title, locomotive identity, and three primary choices without competing controls.", ["title hierarchy", "starter locomotive framing", "large primary actions"]);

  await page.getByRole("button", { name: "BEGIN RUN" }).click();
  await expect(page.locator("#cab")).toBeVisible();
  await page.waitForTimeout(180);
  await capture(page, "01-primary-screens", "02-game-idle", "Railway — idle / brake set", "This is the baseline playable composition: full consist, route, mission, station guidance, telemetry, regulator, and a visibly set train brake.", ["train clears cab", "track contact", "HUD readability", "brake pressure cue"]);

  await page.getByRole("button", { name: "STORE" }).click();
  await expect(page.getByRole("button", { name: "CARRIAGES" })).toBeVisible();
  await capture(page, "01-primary-screens", "03-store-engines", "Store — locomotives", "The roster is the locomotive comparison surface. Cards must keep identity, wheel arrangement, modeled limit, and ownership/equip action legible at a glance.", ["full roster visible through scroll", "consistent card hierarchy", "no clipped previews"]);

  const firstFactSheet = page.locator(".engine-fact-sheet").first();
  await firstFactSheet.locator("summary").click();
  await capture(page, "01-primary-screens", "04-store-engine-fact-expanded", "Store — locomotive fact sheet expanded", "Expanded facts are deliberately denser but remain inside the same store context, preserving provenance and modeled-vs-documented distinctions.", ["source link visible", "fact labels align", "expanded card does not overlap neighbors"]);

  await page.getByRole("button", { name: "CARRIAGES" }).click();
  await expect(page.getByRole("heading", { name: "Build Your Train" })).toBeVisible();
  await capture(page, "01-primary-screens", "05-store-carriages-3", "Store — 3-car consist", "The minimum consist editor exposes car identity, capacity, weight, loaded limit, brake demand, and service interval without entering the driving scene.", ["three editable cars", "loaded metrics", "take-train action"]);

  const addCar = page.getByRole("button", { name: "ADD CAR" });
  for (let i = 0; i < 3; i += 1) if (await addCar.isEnabled()) await addCar.click();
  await expect(page.locator(".consist-list article")).toHaveCount(6);
  await capture(page, "01-primary-screens", "06-store-carriages-6", "Store — 6-car consist", "The maximum consist state proves the editor scales to the gameplay limit and communicates the heavier train's operating consequences.", ["six cars represented", "controls remain reachable", "metrics update"]);

  await page.getByRole("button", { name: "AUDIO PACKS" }).click();
  await expect(page.getByRole("heading", { name: "Audio Packs" })).toBeVisible();
  await capture(page, "01-primary-screens", "07-store-audio-default", "Store — audio packs", "The audio department explains that packs are synthesized analogues and clearly distinguishes the active pack from available alternatives.", ["three packs", "active state", "provenance wording"]);
  const alternateAudio = page.locator('[data-audio-pack="mountain-echo"] button');
  if (await alternateAudio.isEnabled()) await alternateAudio.click();
  await capture(page, "01-primary-screens", "08-store-audio-selected", "Store — alternate audio selected", "Selection must produce an unmistakable installed state without changing the rest of the store layout.", ["selected card installed", "button disabled after selection"]);

  await page.getByRole("button", { name: "Return to railway" }).click();
  await page.getByRole("button", { name: "OPTIONS" }).click();
  await expect(page.getByRole("heading", { name: "Settings & Options" })).toBeVisible();
  await capture(page, "01-primary-screens", "09-options-default", "Settings — default", "The settings panel keeps accessibility and presentation controls large enough for the intended older player while preserving a direct return path.", ["large toggles", "UI scale slider", "current engine context"]);

  const optionLabels = page.locator(".options-list label");
  await optionLabels.filter({ hasText: "High contrast" }).locator('input[type="checkbox"]').check();
  await optionLabels.filter({ hasText: "Reduced motion" }).locator('input[type="checkbox"]').check();
  await setRangeValue(page.locator('.scale-option input[type="range"]'), 120);
  await capture(page, "01-primary-screens", "10-options-accessibility-active", "Settings — accessibility options active", "This state proves the controls remain coherent at maximum interface scale with high-contrast and reduced-motion preferences enabled.", ["120% interface setting", "high contrast checked", "reduced motion checked"]);

  // 02 — Driving states.
  await openFreshGame(page);
  await setRangeValue(page.locator("#throttle"), 78);
  await expect(page.locator(".brake-button")).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => page.locator(".engine-sprite-unit").getAttribute("data-sanding"), { timeout: 8_000 }).toBe("true");
  await capture(page, "02-driving-states", "01-departure-power", "Departure — strong low-speed power", "A hard departure exposes the mechanically important low-speed effects: live regulator, automatic sanding, cylinder clearing, exhaust, and brake release.", ["sanding visible", "brake released", "throttle high", "locomotive remains rail-bound"]);

  await seedSavedRun(page, { throttle: 58, speed: 48, boilerLoad: 63, heat: 0, brakeEngaged: false, visualTravel: 3100, distance: 2.7 });
  await capture(page, "02-driving-states", "02-cruise", "Cruise", "Cruise is the dominant long-duration gameplay state. The scenery should remain primary while speed, target band, route area, resources, and next station stay readable peripherally.", ["48 MPH state", "mission readable", "cab does not obscure train"]);

  await seedSavedRun(page, { throttle: 0, speed: 48, boilerLoad: 58, heat: 0, brakeEngaged: true, visualTravel: 3600, distance: 3.1 });
  await page.waitForTimeout(260);
  await capture(page, "02-driving-states", "03-braking", "Service braking", "The braking state retains the same composition while the brake button fills with actual modeled pressure and speed falls progressively instead of snapping to zero.", ["brake pressed", "partial/full pressure visually encoded", "speed still nonzero"]);

  await seedSavedRun(page, { throttle: 42, speed: 24, boilerLoad: 52, heat: 0, brakeEngaged: false, visualTravel: 4100, distance: 3.5 });
  await page.getByRole("button", { name: "WHISTLE" }).click();
  await expect(page.locator(".train-wrap")).toHaveClass(/is-whistling/);
  await capture(page, "02-driving-states", "04-whistle", "Whistle active", "Whistle is intentionally a transient visual event layered onto normal running, not a modal interruption.", ["whistle event visible", "controls remain usable"]);

  await seedSavedRun(page, { throttle: 100, speed: 34, boilerLoad: 100, heat: 100, brakeEngaged: false, visualTravel: 4700, distance: 4.0 });
  await expect(page.locator(".experience")).toHaveClass(/is-overloaded/, { timeout: 4_000 });
  await capture(page, "02-driving-states", "05-safety-overload", "Overheat / safety intervention", "The safety state must be visibly serious without hiding the railway: heat telemetry, steam release, and reduced operating state communicate the penalty in-place.", ["overload class active", "heat alert visible", "scene remains readable"]);

  await seedSavedRun(page, { throttle: 52, speed: 38, boilerLoad: 60, heat: 0, brakeEngaged: false, visualTravel: 5200, distance: 4.5 }, { sound: true, reducedMotion: false, highContrast: true, uiScale: 100 });
  await capture(page, "02-driving-states", "06-high-contrast-game", "High-contrast driving", "High contrast strengthens panel and edge separation without changing geometry, preserving muscle memory between accessibility modes.", ["same geometry as standard", "stronger panel separation"]);

  // Camera states are user-selectable visual states.
  for (const [index, label] of ["auto", "close", "standard", "wide"].entries()) {
    const button = page.locator(".zoom-card button").filter({ hasText: label });
    await button.click();
    await page.waitForTimeout(120);
    await capture(page, "03-camera-states", `${String(index + 1).padStart(2, "0")}-${label}`, `Camera — ${label}`, "Each camera mode must preserve rail contact and keep the complete consist intelligible while changing how much of the train/scenery dominates the frame.", ["active camera control", "train/cab clearance", "rail contact"]);
  }

  // 04 — Six route biomes, sampled from their stable interior rather than a transition seam.
  const biomeNames = ["high-plains", "red-mesa", "salt-flats", "pine-divide", "alpine-pass", "river-basin"];
  for (let index = 0; index < BIOME_TRAVEL.length; index += 1) {
    await seedSavedRun(page, { throttle: 46, speed: 36, boilerLoad: 56, heat: 0, brakeEngaged: false, visualTravel: BIOME_TRAVEL[index], distance: BIOME_TRAVEL[index] / 1150 });
    await capture(page, "04-route-biomes", `${String(index + 1).padStart(2, "0")}-${biomeNames[index]}`, `Route biome — ${biomeNames[index].replaceAll("-", " ")}`, "Each route biome must read as a distinct place while preserving the same track plane and cab composition, so transitions feel like travel rather than scene replacement.", ["distinct environment", "track continuity", "consistent HUD"]);
  }

  // 05 — Station-specific service scenes. qaStation stages the real runtime station anchor.
  const stationNames = ["cinder-flats", "copper-wash", "saltworks", "timberline", "summit-house", "stillwater"];
  for (let index = 0; index < stationNames.length; index += 1) {
    await page.setViewportSize(DESKTOP);
    await page.goto(`/?qaEngine=southern-4501&qaCars=3&qaStation=${index}&qaService=active`);
    await waitForVisualReady(page);
    await expect(page.locator(`.station-world[data-station-index="${index}"]`)).toHaveAttribute("data-service-active", "true", { timeout: 8_000 });
    await capture(page, "05-station-service-scenes", `${String(index + 1).padStart(2, "0")}-${stationNames[index]}`, `Station service — ${stationNames[index].replaceAll("-", " ")}`, "Each station owns unique service artwork but uses the same platform/service contract: stopped train, low resources, visible crew activity, and progressive dwell feedback.", ["station-specific art", "service active", "low fuel/water warning", "platform alignment"]);
  }

  // Distinct station interaction states.
  await seedSavedRun(page, { throttle: 30, speed: 28, boilerLoad: 50, heat: 0, brakeEngaged: false, visualTravel: STATION_TRAVEL[0] - 500, distance: .4 });
  await capture(page, "06-station-interaction", "01-approach", "Station approach", "The approach state changes the mission from cruise guidance to braking guidance before the train enters the platform zone.", ["BRAKE FOR instruction", "distance visible", "platform ahead"]);

  await seedSavedRun(page, { throttle: 0, speed: 16, boilerLoad: 48, heat: 0, brakeEngaged: true, visualTravel: STATION_TRAVEL[0], distance: .82 });
  await capture(page, "06-station-interaction", "02-platform-too-fast", "Platform zone — too fast", "Entering the platform above the stopping threshold must clearly tell the player to slow below 3 MPH rather than silently refusing the stop.", ["platform zone", "Brake below 3 MPH message", "nonzero speed"]);

  await page.goto("/?qaEngine=southern-4501&qaCars=3&qaStation=0&qaService=active");
  await waitForVisualReady(page);
  await expect(page.locator('.station-world[data-station-index="0"]')).toHaveAttribute("data-service-active", "true", { timeout: 8_000 });
  await capture(page, "06-station-interaction", "03-active-service", "Platform — active servicing", "The active service state shows exactly what is happening: boarding, water, fuel, progress, low-resource recovery, and the station-specific activity layer.", ["service steps", "dwell progress", "crew/activity artwork"]);

  await expect(page.locator(".reward-notice")).toBeVisible({ timeout: 15_000 });
  await capture(page, "06-station-interaction", "04-stop-complete-reward", "Station cleared / reward", "Completion gives a short, high-salience reward acknowledgment while the station card confirms service completion and the playable scene remains visible.", ["reward amount", "station name", "service restored", "nonmodal composition"]);

  // 07 — Run-ending states are intentionally distinct because recovery guidance differs.
  for (const [index, failure] of ["fuel", "water", "service"].entries()) {
    await page.setViewportSize(DESKTOP);
    await page.goto(`/?qaEngine=southern-4501&qaCars=3&qaFailure=${failure}`);
    await waitForVisualReady(page);
    await expect(page.locator(".run-failure")).toBeVisible();
    await capture(page, "07-run-failures", `${String(index + 1).padStart(2, "0")}-${failure}`, `Run ended — ${failure}`, "Failure pauses the railway behind a focused recovery dialog. The cause-specific title/detail teaches the player what to change on the next run.", ["cause-specific copy", "new-run action", "background context retained"]);
  }

  // 08 — Responsive presentation states.
  await openFreshGame(page, { width: 932, height: 430 });
  await capture(page, "08-responsive", "01-short-landscape", "Short landscape", "The compact landscape deliberately hides secondary HUD detail while preserving the train, speed, station instruction, regulator, brake, whistle, and essential telemetry.", ["cab fully inside viewport", "train clears cab", "essential guidance retained"]);

  await cleanStart(page, { width: 390, height: 844 });
  await capture(page, "08-responsive", "02-portrait", "Portrait viewport", "Portrait is captured explicitly because it is an unsupported gameplay orientation; this evidence is used to verify the product communicates that boundary rather than silently clipping controls.", ["orientation handling", "no accidental desktop composition"]);

  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, "manifest.json"), `${JSON.stringify({
    generatedBy: "qa/browser/production-state-audit.spec.mjs",
    screenshotCount: manifest.length,
    sourceBranch: process.env.GITHUB_REF_NAME ?? "local",
    commit: process.env.GITHUB_SHA ?? "local",
    states: manifest,
  }, null, 2)}\n`, "utf8");

  expect(manifest.length).toBeGreaterThanOrEqual(40);
});
