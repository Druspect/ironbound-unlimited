import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const SAVE_KEY = "ironbound-save-v4";

test("Stage G final desktop evidence covers fresh and resumed release entry", async ({ page }) => {
  test.setTimeout(30_000);
  await mkdir("qa-artifacts/stage-g/final", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/");
  const experience = page.locator(".experience");
  await expect(experience).toHaveAttribute("data-app-ready", "true");
  await expect(experience).toHaveAttribute("data-release-stage", "G");
  await expect(page.getByRole("button", { name: "BEGIN RUN" })).toBeVisible();
  await expect(page.locator(".release-stamp").first()).toContainText("Stage G");
  await page.screenshot({
    path: "qa-artifacts/stage-g/final/fresh-release-entry.png",
    animations: "disabled",
    caret: "hide",
  });

  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({
      bonds: 1_250,
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
      careerProgress: {
        completedRuns: 1,
        totalStationsCleared: 6,
        lifetimeBondsEarned: 3_500,
        bestRunBonds: 3_500,
      },
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
  await page.reload();
  await expect(experience).toHaveAttribute("data-app-ready", "true");
  await expect(page.getByRole("button", { name: "CONTINUE RUN" })).toBeVisible();
  await expect(page.locator(".intro-panel")).toContainText("2 of 6 stops");
  await page.screenshot({
    path: "qa-artifacts/stage-g/final/resume-release-entry.png",
    animations: "disabled",
    caret: "hide",
  });
});

test("Stage G final compact evidence keeps the Dad-ready driving controls usable", async ({ page }) => {
  await mkdir("qa-artifacts/stage-g/final", { recursive: true });
  await page.setViewportSize({ width: 932, height: 430 });
  await page.goto("/");
  await expect(page.locator(".experience")).toHaveAttribute("data-app-ready", "true");
  await page.getByRole("button", { name: "BEGIN RUN" }).click();

  await expect(page.locator(".mission-card h1")).toBeVisible();
  await expect(page.locator("#throttle")).toBeVisible();
  await expect(page.getByRole("button", { name: /BRAKE/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /WHISTLE/i })).toBeVisible();

  const fit = await page.evaluate(() => {
    const mission = document.querySelector(".mission-card")?.getBoundingClientRect();
    const cab = document.querySelector(".cab")?.getBoundingClientRect();
    const controls = document.querySelector(".control-buttons")?.getBoundingClientRect();
    return {
      missionLeft: mission?.left ?? NaN,
      missionRight: mission?.right ?? NaN,
      cabBottom: cab?.bottom ?? NaN,
      controlsRight: controls?.right ?? NaN,
      width: innerWidth,
      height: innerHeight,
    };
  });
  expect(fit.missionLeft).toBeGreaterThanOrEqual(-2);
  expect(fit.missionRight).toBeLessThanOrEqual(fit.width + 2);
  expect(fit.cabBottom).toBeLessThanOrEqual(fit.height + 2);
  expect(fit.controlsRight).toBeLessThanOrEqual(fit.width + 2);

  await page.screenshot({
    path: "qa-artifacts/stage-g/final/compact-live-run.png",
    animations: "disabled",
    caret: "hide",
  });
});
