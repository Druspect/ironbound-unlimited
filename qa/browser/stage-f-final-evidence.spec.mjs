import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const stations = [
  ["cinder-flats", "Cinder Flats", "high-plains"],
  ["copper-wash", "Copper Wash", "red-mesa"],
  ["saltworks", "Saltworks", "salt-flats"],
  ["timberline", "Timberline", "pine-divide"],
  ["summit-house", "Summit House", "alpine-pass"],
  ["stillwater", "Stillwater", "river-basin"],
];

test("Stage F desktop evidence covers every station and biome identity", async ({ page }) => {
  test.setTimeout(60_000);
  await mkdir("qa-artifacts/stage-f/final", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (let index = 0; index < stations.length; index += 1) {
    const [id, name, biome] = stations[index];
    await page.goto(`/?qaEngine=tom-thumb&qaCars=6&qaStation=${index}`);

    const experience = page.locator(".experience");
    const station = page.locator(`.station-world[data-station-id="${id}"]`);
    await expect(experience).toHaveAttribute("data-biome-id", biome);
    await expect(station).toHaveAttribute("data-station-name", name);
    await expect(station.locator(".station-place-sign")).toContainText(name);
    await expect(page.locator(".station-card")).toContainText(name);
    await expect(page.locator(".train-wrap")).toBeVisible();
    await expect(page.locator(".cab")).toBeVisible();

    const geometry = await page.evaluate((stationId) => {
      const train = document.querySelector(".train-wrap")?.getBoundingClientRect();
      const cab = document.querySelector(".cab")?.getBoundingClientRect();
      const platform = document.querySelector(`.station-world[data-station-id="${stationId}"]`)?.getBoundingClientRect();
      return {
        trainRight: train?.right ?? NaN,
        trainLeft: train?.left ?? NaN,
        cabTop: cab?.top ?? NaN,
        platformTop: platform?.top ?? NaN,
        viewportWidth: innerWidth,
      };
    }, id);
    expect(geometry.trainLeft).toBeGreaterThanOrEqual(-12);
    expect(geometry.trainRight).toBeLessThanOrEqual(geometry.viewportWidth + 12);
    expect(geometry.platformTop).toBeLessThan(geometry.cabTop);

    await page.screenshot({
      path: `qa-artifacts/stage-f/final/${String(index + 1).padStart(2, "0")}-${id}.png`,
      animations: "disabled",
      caret: "hide",
    });
  }

  expect(pageErrors).toEqual([]);
});

test("Stage F compact landscape preserves route identity and older-player controls", async ({ page }) => {
  test.setTimeout(30_000);
  await mkdir("qa-artifacts/stage-f/final", { recursive: true });
  await page.setViewportSize({ width: 932, height: 430 });

  for (const index of [2, 5]) {
    const [id, name] = stations[index];
    await page.goto(`/?qaEngine=tom-thumb&qaCars=3&qaStation=${index}`);

    await expect(page.locator(".mission-card h1")).toBeVisible();
    await expect(page.locator(".station-card")).toContainText(name);
    await expect(page.locator("#throttle")).toBeVisible();
    await expect(page.getByRole("button", { name: /BRAKE/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /WHISTLE/i })).toBeVisible();

    const fit = await page.evaluate(() => {
      const cab = document.querySelector(".cab")?.getBoundingClientRect();
      const train = document.querySelector(".train-wrap")?.getBoundingClientRect();
      const mission = document.querySelector(".mission-card")?.getBoundingClientRect();
      return {
        cabBottom: cab?.bottom ?? NaN,
        trainRight: train?.right ?? NaN,
        trainLeft: train?.left ?? NaN,
        missionRight: mission?.right ?? NaN,
        width: innerWidth,
        height: innerHeight,
      };
    });
    expect(fit.cabBottom).toBeLessThanOrEqual(fit.height + 2);
    expect(fit.trainLeft).toBeGreaterThanOrEqual(-8);
    expect(fit.trainRight).toBeLessThanOrEqual(fit.width + 8);
    expect(fit.missionRight).toBeLessThanOrEqual(fit.width);

    await page.screenshot({
      path: `qa-artifacts/stage-f/final/compact-${id}.png`,
      animations: "disabled",
      caret: "hide",
    });
  }
});
