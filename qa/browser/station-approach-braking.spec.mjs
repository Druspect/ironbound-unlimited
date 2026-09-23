import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const SALTWORKS_TRAVEL = 12443;
const APPROACH_OFFSET = 150;

test("driver can brake a live downgrade approach into the Saltworks service zone", async ({ page }) => {
  test.setTimeout(40_000);
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.addInitScript(({ travel }) => {
    localStorage.setItem("ironbound-save-v4", JSON.stringify({
      bonds: 0,
      ownedEngines: ["tom-thumb", "southern-4501"],
      equippedEngine: "southern-4501",
      consistCars: ["pullman", "day-coach", "baggage-mail"],
      cameraZoom: "auto",
      settings: { sound: false, reducedMotion: false, highContrast: false, uiScale: 100 },
      run: {
        throttle: 0,
        speed: 18,
        boilerLoad: 48,
        heat: 0,
        distance: 10.5,
        visualTravel: travel,
        brakeEngaged: false,
        brakePressure: 0,
        brakeCylinderPressure: 0,
        fuel: 78,
        water: 74,
        stationsWithoutService: 1,
        failure: null,
        claimedStops: [],
        servicedStationSequence: -1,
      },
    }));
  }, { travel: SALTWORKS_TRAVEL - APPROACH_OFFSET });

  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN RUN" }).click();
  await expect(page.locator("#cab")).toBeVisible();
  await expect(page.locator(".mission-card")).toContainText(/Brake (for Saltworks|below 3 MPH)/i, { timeout: 5_000 });

  const grade = page.locator(".telemetry-grid div").filter({ hasText: "GRADE" }).locator("strong");
  await expect.poll(async () => Number.parseFloat((await grade.textContent()) ?? "0"), { timeout: 4_000 }).toBeLessThan(-1);

  const speed = page.locator(".speed-reading strong");
  const startingSpeed = Number((await speed.textContent()) ?? 18);
  await page.getByRole("button", { name: "Apply train brake" }).click();

  const experience = page.locator(".experience");
  await expect.poll(async () => Number(await experience.getAttribute("data-brake-line-pressure")), { timeout: 4_000 }).toBeGreaterThan(.45);
  await expect.poll(async () => Number(await experience.getAttribute("data-brake-cylinder-pressure")), { timeout: 4_000 }).toBeGreaterThan(.15);
  await expect.poll(async () => Number((await speed.textContent()) ?? startingSpeed), { timeout: 6_000 }).toBeLessThan(startingSpeed - 4);

  const stationCard = page.locator(".station-card");
  await expect(stationCard).toHaveClass(/at-platform/, { timeout: 8_000 });
  await expect(stationCard).toContainText("Brake below 3 MPH");

  await expect.poll(async () => Number((await speed.textContent()) ?? 99), { timeout: 12_000 }).toBeLessThan(3);
  await expect(stationCard).toContainText(/Hold stopped|Stop complete|Passengers/i, { timeout: 8_000 });
  await expect(page.locator('.station-world[data-station-index="2"]')).toHaveAttribute("data-service-active", "true", { timeout: 8_000 });
  await expect(page.locator(".run-failure")).toHaveCount(0);

  await mkdir("qa-artifacts/remediation", { recursive: true });
  await page.screenshot({ path: "qa-artifacts/remediation/saltworks-downgrade-controlled-stop.png", animations: "disabled" });
});
