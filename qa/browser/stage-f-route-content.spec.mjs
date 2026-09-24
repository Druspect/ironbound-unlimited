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


test("Stage F biome treatment and station identities remain readable without changing controls", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/?qaEngine=tom-thumb&qaCars=3&qaStation=5");

  const experience = page.locator(".experience");
  await expect(experience).toHaveAttribute("data-biome-id", /.+/);
  await expect(page.locator('.station-world[data-station-id="stillwater"] .station-place-sign')).toContainText("Stillwater");
  await expect(page.locator('.station-world[data-station-role="terminal"]')).toHaveCount(1);
  await expect(page.locator(".station-card")).toContainText(/River Basin|Westbound terminal/);
  await expect(page.locator("#throttle")).toBeVisible();
  await expect(page.getByRole("button", { name: /BRAKE/i })).toBeVisible();

  const vars = await experience.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      sky: style.getPropertyValue("--biome-sky").trim(),
      ground: style.getPropertyValue("--biome-ground").trim(),
      scrub: style.getPropertyValue("--biome-scrub-saturation").trim(),
    };
  });
  expect(vars.sky).toMatch(/^rgb/);
  expect(vars.ground).toMatch(/^rgb/);
  expect(Number(vars.scrub)).toBeGreaterThan(0);

  await page.screenshot({
    path: "qa-artifacts/stage-f/stillwater-terminal-identity.png",
    animations: "disabled",
    caret: "hide",
  });
});


test("Stage F line-side events are decorative, deterministic, and behind the train", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/?qaEngine=tom-thumb&qaCars=3&qaStation=0");

  await expect(page.locator("[data-route-event]")).toHaveCount(7);
  const ids = await page.locator("[data-route-event]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-route-event")));
  expect(new Set(ids).size).toBe(7);

  const layering = await page.evaluate(() => ({
    event: Number(getComputedStyle(document.querySelector(".route-event")).zIndex),
    route: Number(getComputedStyle(document.querySelector(".route-strip")).zIndex),
    train: Number(getComputedStyle(document.querySelector(".train-wrap")).zIndex),
    pointerEvents: getComputedStyle(document.querySelector(".route-event")).pointerEvents,
  }));
  expect(layering.event).toBeLessThan(layering.train);
  expect(layering.route).toBeLessThan(layering.train);
  expect(layering.pointerEvents).toBe("none");
});
