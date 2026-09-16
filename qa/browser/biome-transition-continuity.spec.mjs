import { expect, test } from "@playwright/test";

async function routeGeometry(page) {
  return page.locator(".route-tile").evaluateAll((tiles) => {
    const rects = tiles.slice(0, 6).map((tile) => tile.getBoundingClientRect());
    const boundaryOld = getComputedStyle(tiles[4]);
    const boundaryNew = getComputedStyle(tiles[5]);
    const haze = getComputedStyle(document.querySelector(".biome-transition-haze"));
    return {
      viewport: window.innerWidth,
      tileWidth: rects[0].width,
      steps: rects.slice(1).map((rect, index) => rect.left - rects[index].left),
      overlaps: rects.slice(1).map((rect, index) => rects[index].right - rect.left),
      oldImage: boundaryOld.backgroundImage,
      newImage: boundaryNew.backgroundImage,
      oldMask: boundaryOld.maskImage || boundaryOld.webkitMaskImage,
      newMask: boundaryNew.maskImage || boundaryNew.webkitMaskImage,
      hazeFilter: haze.filter,
    };
  });
}

async function openRoute(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto("/?qaEngine=tom-thumb&qaCars=3");
  await expect(page.locator(".route-tile").first()).toBeVisible({ timeout: 10_000 });
}

test.describe("biome transition continuity", () => {
  test("desktop route keeps one-viewport progression while widening visual overlap", async ({ page }) => {
    await openRoute(page, 1365, 768);
    const geometry = await routeGeometry(page);

    for (const step of geometry.steps) expect(Math.abs(step - geometry.viewport)).toBeLessThanOrEqual(1);
    for (const overlap of geometry.overlaps) {
      expect(overlap).toBeGreaterThanOrEqual(600);
      expect(overlap).toBeLessThanOrEqual(761);
    }
    expect(geometry.tileWidth - geometry.viewport).toBeGreaterThanOrEqual(600);
    expect(geometry.oldImage).not.toBe(geometry.newImage);
    expect(geometry.oldMask).toContain("linear-gradient");
    expect(geometry.newMask).toContain("linear-gradient");
    expect(geometry.hazeFilter).toContain("blur(8px)");
  });

  test("short landscape retains the same route step with a bounded blend envelope", async ({ page }) => {
    await openRoute(page, 900, 620);
    const geometry = await routeGeometry(page);

    for (const step of geometry.steps) expect(Math.abs(step - geometry.viewport)).toBeLessThanOrEqual(1);
    for (const overlap of geometry.overlaps) {
      expect(overlap).toBeGreaterThanOrEqual(420);
      expect(overlap).toBeLessThanOrEqual(601);
    }
    expect(geometry.tileWidth - geometry.viewport).toBeGreaterThanOrEqual(420);
  });
});
