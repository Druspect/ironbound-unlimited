import { expect, test } from "@playwright/test";

const TERMINAL_TRAVEL = 25.82 * 1150;
const TERMINAL_MILES = TERMINAL_TRAVEL / 3600;

test("fresh run gives one clear action and exposes six-stop schedule progress", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN RUN" }).click();

  await expect(page.locator(".mission-card h1")).toHaveText("Release the brake, then ease on steam.");
  await expect(page.locator(".mission-card .route-progress")).toHaveAttribute(
    "aria-label",
    "Route progress 0 of 6 stops",
  );
  await expect(page.locator(".station-card")).toContainText("Cinder Flats");
  await expect(page.locator(".station-card")).toContainText("Passengers");
  await expect(page.locator(".station-card")).toContainText("bonds");

  await page.getByRole("button", { name: "Release train brake" }).click();
  await expect(page.locator(".mission-card h1")).toContainText("Hold");
});

test("Stillwater closes a six-stop run, awards the terminal bonus, and persists career progress", async ({ page }) => {
  test.setTimeout(35_000);
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.addInitScript(({ terminalTravel, terminalMiles }) => {
    localStorage.setItem("ironbound-save-v4", JSON.stringify({
      bonds: 500,
      ownedEngines: ["tom-thumb"],
      equippedEngine: "tom-thumb",
      consistCars: [
        "observation-car",
        "pullman",
        "day-coach",
        "dining-car",
        "day-coach",
        "baggage-mail",
      ],
      cameraZoom: "auto",
      settings: { sound: false, reducedMotion: false, highContrast: false, uiScale: 100 },
      selectedAudioPack: "heritage-steam",
      runProgress: {
        clearedStationIds: [
          "cinder-flats",
          "copper-wash",
          "saltworks",
          "timberline",
          "summit-house",
        ],
        stationBonds: 2_000,
        drivingBonusBonds: 100,
        completionBonusBonds: 0,
        completed: false,
      },
      careerProgress: {
        completedRuns: 0,
        totalStationsCleared: 0,
        lifetimeBondsEarned: 0,
        bestRunBonds: 0,
      },
      run: {
        throttle: 0,
        speed: 0,
        boilerLoad: 42,
        heat: 0,
        distance: terminalMiles,
        visualTravel: terminalTravel,
        brakeEngaged: true,
        brakePressure: 1,
        brakeCylinderPressure: 1,
        fuel: 92,
        water: 88,
        stationsWithoutService: 1,
        failure: null,
        claimedStops: ["0-0", "0-1", "0-2", "0-3", "0-4"],
        servicedStationSequence: 3,
      },
    }));
  }, { terminalTravel: TERMINAL_TRAVEL, terminalMiles: TERMINAL_MILES });

  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN RUN" }).click();

  await expect(page.locator(".station-card")).toContainText("Stillwater");
  await expect(page.locator(".station-card")).toContainText("Terminal full service");
  await expect(page.locator(".run-complete")).toBeVisible({ timeout: 18_000 });
  await expect(page.locator(".run-complete")).toContainText("6/6");
  await expect(page.locator(".run-complete")).toContainText("CAREER RUNS");
  await expect(page.locator(".run-complete")).toContainText("1");

  await expect.poll(async () => {
    return page.evaluate(() => {
      const raw = localStorage.getItem("ironbound-save-v4");
      if (!raw) return null;
      const saved = JSON.parse(raw);
      return {
        completed: saved.runProgress?.completed,
        cleared: saved.runProgress?.clearedStationIds?.length,
        careerRuns: saved.careerProgress?.completedRuns,
        bonds: saved.bonds,
      };
    });
  }, { timeout: 5_000 }).toMatchObject({
    completed: true,
    cleared: 6,
    careerRuns: 1,
    bonds: expect.any(Number),
  });

  const savedBonds = await page.evaluate(() => JSON.parse(localStorage.getItem("ironbound-save-v4")).bonds);
  expect(savedBonds).toBeGreaterThan(500);

  await page.getByRole("button", { name: "START NEXT RUN" }).click();
  await expect(page.locator(".run-complete")).toHaveCount(0);
  await expect(page.locator(".mission-card .route-progress")).toHaveAttribute(
    "aria-label",
    "Route progress 0 of 6 stops",
  );
  await expect(page.locator(".brake-button")).toHaveAttribute("aria-pressed", "true");
});
