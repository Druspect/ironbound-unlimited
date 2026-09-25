import { expect, test } from "@playwright/test";

const SAVE_KEY = "ironbound-save-v4";

test("Stage G fresh launch is release-ready and Escape cannot start the run", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/");
  const experience = page.locator(".experience");
  await expect(experience).toHaveAttribute("data-app-ready", "true");
  await expect(experience).toHaveAttribute("data-release-stage", "G");
  await expect(page.getByRole("button", { name: "BEGIN RUN" })).toBeEnabled();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "BEGIN RUN" })).toBeVisible();
  await expect(page.locator("#cab")).toBeVisible();
  await expect(page.locator(".game-shell.shell-intro")).toBeVisible();
});

test("Stage G identifies and resumes an in-progress saved run", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({
      bonds: 750,
      ownedEngines: ["tom-thumb"],
      equippedEngine: "tom-thumb",
      consistCars: ["pullman", "day-coach", "baggage-mail"],
      runProgress: {
        clearedStationIds: ["cinder-flats", "copper-wash"],
        stationBonds: 550,
        drivingBonusBonds: 0,
        completionBonusBonds: 0,
        completed: false,
      },
      careerProgress: { completedRuns: 0, totalStationsCleared: 0, lifetimeBondsEarned: 0, bestRunBonds: 0 },
      run: {
        throttle: 0,
        speed: 0,
        boilerLoad: 42,
        heat: 0,
        distance: 2.5,
        visualTravel: 7600,
        brakeEngaged: true,
        brakePressure: 1,
        brakeCylinderPressure: 1,
        fuel: 88,
        water: 91,
        stationsWithoutService: 2,
        failure: null,
        claimedStops: ["0-0", "0-1"],
        servicedStationSequence: 1,
      },
    }));
  }, SAVE_KEY);

  await page.goto("/");
  await expect(page.locator(".experience")).toHaveAttribute("data-app-ready", "true");
  await expect(page.getByRole("button", { name: "CONTINUE RUN" })).toBeVisible();
  await expect(page.locator(".intro-panel")).toContainText("2 of 6 stops");
  await page.getByRole("button", { name: "CONTINUE RUN" }).click();
  await expect(page.locator(".mission-card")).toContainText("STOP 3 OF 6");
  await expect(page.locator(".telemetry-grid")).toContainText("2.5 MI");
});

test("Stage G rejects malformed save JSON and returns a clean usable menu", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "{broken-json"), SAVE_KEY);
  await page.goto("/");

  await expect(page.locator(".experience")).toHaveAttribute("data-app-ready", "true");
  await expect(page.getByRole("button", { name: "BEGIN RUN" })).toBeEnabled();
  await expect(page.locator(".save-recovery-notice")).toContainText("damaged local save");
  expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBeNull();

  await page.getByRole("button", { name: "OPEN STORE" }).click();
  await expect(page.getByRole("heading", { name: "Store" })).toBeVisible();
});

test("Stage G Escape returns overlays to the railway but leaves intro alone", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".experience")).toHaveAttribute("data-app-ready", "true");
  await page.getByRole("button", { name: "BEGIN RUN" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Settings & Options" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".game-shell")).toHaveCount(0);

  await page.getByRole("button", { name: "STORE" }).click();
  await expect(page.getByRole("heading", { name: "Store" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".game-shell")).toHaveCount(0);
});
