import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const ROOT = "qa-artifacts/stage-d";

async function waitForImages(page) {
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  await page.evaluate(async () => { await document.fonts?.ready; });
}

test("final desktop and compact-landscape evidence remains playable and contained", async ({ page }) => {
  test.setTimeout(60_000);
  await mkdir(ROOT, { recursive: true });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?qaEngine=big-boy-4014&qaCars=6&qaStation=0");
  await expect(page.locator('[data-engine-sprite="big-boy-4014"]')).toBeVisible();
  await expect(page.locator(".consist-car")).toHaveCount(6);
  await expect(page.locator("#cab")).toBeVisible();
  await waitForImages(page);

  const desktop = await page.evaluate(() => {
    const cab = document.querySelector("#cab")?.getBoundingClientRect();
    const engine = document.querySelector('[data-engine-sprite="big-boy-4014"]')?.getBoundingClientRect();
    const cars = [...document.querySelectorAll(".consist-car")].map((element) => element.getBoundingClientRect());
    if (!cab || !engine || cars.length !== 6) return null;
    return {
      cabBottom: cab.bottom,
      engineRight: engine.right,
      consistLeft: cars[0].left,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    };
  });
  expect(desktop).not.toBeNull();
  expect(desktop.cabBottom).toBeLessThanOrEqual(desktop.viewportHeight + 2);
  expect(desktop.engineRight).toBeLessThanOrEqual(desktop.viewportWidth + 2);
  expect(desktop.consistLeft).toBeGreaterThanOrEqual(-2);
  await page.screenshot({ path: `${ROOT}/desktop-six-car-final.png`, animations: "disabled", caret: "hide" });

  await page.setViewportSize({ width: 932, height: 430 });
  await page.goto("/?qaEngine=tom-thumb&qaCars=3");
  await expect(page.locator('[data-engine-sprite="tom-thumb"]')).toBeVisible();
  await expect(page.locator("#cab")).toBeVisible();
  await waitForImages(page);

  const compact = await page.evaluate(() => {
    const cab = document.querySelector("#cab")?.getBoundingClientRect();
    const engine = document.querySelector('[data-engine-sprite="tom-thumb"]')?.getBoundingClientRect();
    const resources = [...document.querySelectorAll(".resource-monitors > div > span")];
    if (!cab || !engine) return null;
    return {
      cabBottom: cab.bottom,
      clearance: cab.top - engine.bottom,
      viewportHeight: innerHeight,
      overflow: resources.map((element) => element.scrollWidth - element.clientWidth),
    };
  });
  expect(compact).not.toBeNull();
  expect(compact.cabBottom).toBeLessThanOrEqual(compact.viewportHeight + 2);
  expect(compact.clearance).toBeGreaterThanOrEqual(-2);
  for (const overflow of compact.overflow) expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: `${ROOT}/compact-landscape-final.png`, animations: "disabled", caret: "hide" });

  expect(pageErrors).toEqual([]);
});
