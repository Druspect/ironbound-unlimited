import { expect, test } from "@playwright/test";

test("realistic track section preserves rail hierarchy and wheel contact", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/?qaEngine=tom-thumb&qaCars=6&qaStation=0");
  await expect(page.locator(".scene")).toBeVisible();
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));

  const section = await page.evaluate(() => {
    const track = document.querySelector(".track");
    const near = document.querySelector(".rail-near");
    const far = document.querySelector(".rail-far");
    const ballast = document.querySelector(".ballast");
    const sleepers = document.querySelector(".sleepers");
    const wheels = [...document.querySelectorAll(".consist-car .small-wheel")];
    if (!track || !near || !far || !ballast || !sleepers || wheels.length !== 24) return null;

    const trackStyle = getComputedStyle(track);
    const nearBox = near.getBoundingClientRect();
    const farBox = far.getBoundingClientRect();
    const ballastBox = ballast.getBoundingClientRect();
    const wheelGaps = wheels.map((wheel) => Math.abs(wheel.getBoundingClientRect().bottom - nearBox.top));

    return {
      railCount: track.querySelectorAll(":scope > .rail").length,
      tiePitchPx: Number.parseFloat(trackStyle.getPropertyValue("--track-tie-pitch")),
      tieFacePx: Number.parseFloat(trackStyle.getPropertyValue("--track-tie-face")),
      motionPeriodPx: Number.parseFloat(trackStyle.getPropertyValue("--track-motion-period")),
      gaugeInches: Number.parseFloat(trackStyle.getPropertyValue("--track-standard-gauge-in")),
      near: { top: nearBox.top, bottom: nearBox.bottom, height: nearBox.height },
      far: { top: farBox.top, bottom: farBox.bottom, height: farBox.height },
      ballast: { top: ballastBox.top, bottom: ballastBox.bottom, height: ballastBox.height },
      maxWheelGap: Math.max(...wheelGaps),
      railTopSeparation: nearBox.top - farBox.top,
      sleeperZ: Number.parseInt(getComputedStyle(sleepers).zIndex, 10),
      nearRailZ: Number.parseInt(getComputedStyle(near).zIndex, 10),
      ballastZ: Number.parseInt(getComputedStyle(ballast).zIndex, 10),
    };
  });

  expect(section).not.toBeNull();
  expect(section.railCount).toBe(2);
  expect(section.gaugeInches).toBe(56.5);
  expect(section.tiePitchPx).toBe(32);
  expect(section.tieFacePx).toBe(15);
  expect(section.motionPeriodPx % section.tiePitchPx).toBe(0);

  expect(section.near.height).toBeCloseTo(9, 1);
  expect(section.far.height).toBeCloseTo(4, 1);
  expect(section.railTopSeparation).toBeGreaterThanOrEqual(7);
  expect(section.railTopSeparation).toBeLessThanOrEqual(13);
  expect(section.maxWheelGap).toBeLessThanOrEqual(.75);

  expect(section.ballast.top).toBeLessThan(section.far.top);
  expect(section.ballast.bottom).toBeGreaterThan(section.near.bottom);
  expect(section.ballastZ).toBeLessThan(section.sleeperZ);
  expect(section.sleeperZ).toBeLessThan(section.nearRailZ);
});
