import { expect, test } from "@playwright/test";

async function pressure(page, attribute) {
  return Number(await page.locator(".experience").getAttribute(attribute));
}

async function resources(page) {
  const meters = page.locator(".resource-monitors > div[role=\"meter\"]");
  return {
    fuel: Number(await meters.nth(0).getAttribute("aria-valuenow")),
    water: Number(await meters.nth(1).getAttribute("aria-valuenow")),
  };
}

test("resources and live brake state survive Store pause and resume without reset", async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.addInitScript(() => {
    localStorage.setItem("ironbound-save-v4", JSON.stringify({
      bonds: 0,
      ownedEngines: ["tom-thumb"],
      equippedEngine: "tom-thumb",
      consistCars: ["pullman", "day-coach", "baggage-mail", "pullman", "day-coach", "baggage-mail"],
      cameraZoom: "auto",
      settings: { sound: true, reducedMotion: false, highContrast: false, uiScale: 100 },
      selectedAudioPack: "heritage-steam",
      run: {
        throttle: 78,
        speed: 18,
        boilerLoad: 64,
        heat: 38,
        distance: 1.4,
        visualTravel: 120,
        brakeEngaged: true,
        brakePressure: 0.62,
        brakeCylinderPressure: 0.44,
        fuel: 63,
        water: 58,
        stationsWithoutService: 1,
        failure: null,
      },
    }));
  });

  await page.goto("/");
  await expect.poll(() => pressure(page, "data-brake-line-pressure")).toBeCloseTo(0.62, 2);
  await expect.poll(() => pressure(page, "data-brake-cylinder-pressure")).toBeCloseTo(0.44, 2);
  expect(await resources(page)).toEqual({ fuel: 63, water: 58 });

  await page.getByRole("button", { name: "BEGIN RUN" }).click();
  await expect(page.locator(".consist-car")).toHaveCount(6);
  await page.waitForTimeout(180);
  await page.getByRole("button", { name: "STORE" }).click();
  await expect(page.getByRole("heading", { name: "Store" })).toBeVisible();
  await page.waitForTimeout(300);

  const held = {
    line: await pressure(page, "data-brake-line-pressure"),
    cylinder: await pressure(page, "data-brake-cylinder-pressure"),
    ...(await resources(page)),
  };
  expect(held.line).toBeGreaterThan(0.6);
  expect(held.cylinder).toBeGreaterThan(0.4);
  expect(held.fuel).toBeLessThanOrEqual(63);
  expect(held.water).toBeLessThanOrEqual(58);

  await page.waitForTimeout(1_000);
  const stillHeld = {
    line: await pressure(page, "data-brake-line-pressure"),
    cylinder: await pressure(page, "data-brake-cylinder-pressure"),
    ...(await resources(page)),
  };
  expect(Math.abs(stillHeld.line - held.line)).toBeLessThan(0.01);
  expect(Math.abs(stillHeld.cylinder - held.cylinder)).toBeLessThan(0.01);
  expect(stillHeld.fuel).toBe(held.fuel);
  expect(stillHeld.water).toBe(held.water);

  await page.getByRole("button", { name: "Return to railway" }).click();
  await expect(page.locator(".brake-button")).toHaveAttribute("aria-pressed", "true");
  expect(await resources(page)).toEqual({ fuel: held.fuel, water: held.water });

  await page.getByRole("button", { name: "Release train brake" }).click();
  await expect.poll(() => pressure(page, "data-brake-line-pressure"), { timeout: 5_000 })
    .toBeLessThan(held.line - 0.12);
  await expect.poll(() => pressure(page, "data-brake-cylinder-pressure"), { timeout: 8_000 })
    .toBeLessThan(held.cylinder - 0.08);

  const resumed = await resources(page);
  expect(resumed.fuel).toBeLessThanOrEqual(held.fuel);
  expect(resumed.water).toBeLessThanOrEqual(held.water);
  await expect(page.locator(".consist-car")).toHaveCount(6);
});
