import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("Stage F route content is data-driven and keeps landmarks behind the railway", async ({ page }) => {
  await mkdir("qa-artifacts/stage-f", { recursive: true });
  await page.setViewportSize({ width: 1365, height: 768 });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/?qaEngine=tom-thumb&qaCars=3&qaStation=1");
  await expect(page.locator('[data-engine-sprite="tom-thumb"]')).toBeVisible();

  for (const biome of ["high-plains", "red-mesa", "salt-flats", "pine-divide", "alpine-pass", "river-basin"]) {
    const tiles = page.locator(`.route-tile[data-biome-id="${biome}"]`);
    await expect(tiles.first()).toBeAttached();
    expect(await tiles.count()).toBeGreaterThanOrEqual(5);
    expect(await tiles.locator(".route-landmark").count()).toBeGreaterThanOrEqual(2);
  }

  const stacking = await page.evaluate(() => {
    const landmark = document.querySelector(".route-landmark");
    const train = document.querySelector(".train-wrap");
    const station = document.querySelector(".station-layer");
    const landmarkZ = landmark ? Number(getComputedStyle(landmark).zIndex) : Number.NaN;
    const routeZ = Number(getComputedStyle(document.querySelector(".route-strip")).zIndex);
    const trainZ = train ? Number(getComputedStyle(train).zIndex) : Number.NaN;
    const stationZ = station ? Number(getComputedStyle(station).zIndex) : Number.NaN;
    return { landmarkZ, routeZ, trainZ, stationZ };
  });
  expect(stacking.routeZ).toBeLessThan(stacking.stationZ);
  expect(stacking.routeZ).toBeLessThan(stacking.trainZ);
  expect(stacking.landmarkZ).toBeGreaterThanOrEqual(0);

  await page.screenshot({
    path: "qa-artifacts/stage-f/route-content-backbone.png",
    animations: "disabled",
    caret: "hide",
  });
  expect(pageErrors).toEqual([]);
});
