import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const STATIONS = ["cinder-flats", "copper-wash", "saltworks", "timberline", "summit-house", "stillwater"];

test("stage B station foreground keeps people visible without covering running gear", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1365, height: 768 });
  await mkdir("qa-artifacts/stage-b", { recursive: true });

  for (let index = 0; index < STATIONS.length; index += 1) {
    await page.goto(`/?qaEngine=tom-thumb&qaCars=3&qaStation=${index}&qaService=active`);

    const station = page.locator(`.station-world[data-station-index="${index}"]`);
    const foreground = page.locator(`[data-station-foreground-index="${index}"]`);
    const platform = foreground.locator(".station-near-platform");
    const people = foreground.locator(".station-foreground-passengers");
    const nearRail = page.locator(".rail-near");

    await expect.poll(async () => station.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const center = box.left + box.width / 2;
      return Number(getComputedStyle(node).opacity) >= .95 &&
        Math.abs(center - window.innerWidth * .40) <= 3 &&
        node.dataset.serviceActive === "true";
    }), { timeout: 12_000, message: `${STATIONS[index]} must reach the platform before Stage B capture` }).toBe(true);

    await expect.poll(async () => foreground.evaluate((node) =>
      node.classList.contains("station-near-active") && Number(getComputedStyle(node).opacity) >= .95
    ), { timeout: 5_000 }).toBe(true);

    await expect(people).toHaveCount(2);

    const geometry = await page.evaluate((stationIndex) => {
      const foreground = document.querySelector(`[data-station-foreground-index="${stationIndex}"]`);
      const platform = foreground?.querySelector(".station-near-platform");
      const rail = document.querySelector(".rail-near");
      const train = document.querySelector(".train-consist");
      const passengerLayers = [...(foreground?.querySelectorAll(".station-foreground-passengers") ?? [])];
      if (!foreground || !platform || !rail || !train) return null;
      const fg = foreground.getBoundingClientRect();
      const deck = platform.getBoundingClientRect();
      const railBox = rail.getBoundingClientRect();
      const trainBox = train.getBoundingClientRect();
      return {
        foreground: { left: fg.left, right: fg.right, opacity: Number(getComputedStyle(foreground).opacity) },
        deck: { top: deck.top, bottom: deck.bottom, height: deck.height },
        rail: { top: railBox.top, bottom: railBox.bottom },
        train: { top: trainBox.top, bottom: trainBox.bottom },
        people: passengerLayers.map((layer) => ({
          backgroundImage: getComputedStyle(layer).backgroundImage,
          opacity: Number(getComputedStyle(layer).opacity),
          width: layer.getBoundingClientRect().width,
          height: layer.getBoundingClientRect().height,
        })),
      };
    }, index);

    expect(geometry).not.toBeNull();
    expect(geometry.foreground.opacity).toBeGreaterThan(.9);
    expect(geometry.deck.height).toBeGreaterThan(20);
    // The player-side deck begins at or below the near-rail top, so the wheel
    // faces and couplers remain readable above it.
    expect(geometry.deck.top).toBeGreaterThanOrEqual(geometry.rail.top - 2.5);
    expect(geometry.deck.top).toBeGreaterThan(geometry.train.top + 70);
    for (const layer of geometry.people) {
      expect(layer.backgroundImage).toContain(`/assets/stations/service/v1/${STATIONS[index]}.webp`);
      expect(layer.opacity).toBeGreaterThan(.65);
      expect(layer.width).toBeGreaterThan(300);
    }

    const shot = await page.screenshot({
      path: `qa-artifacts/stage-b/station-foreground-${index + 1}-${STATIONS[index]}.png`,
      animations: "disabled",
      caret: "hide",
    });
    await testInfo.attach(`stage-b-${STATIONS[index]}`, { body: shot, contentType: "image/png" });
  }
});

test("stage B foreground simplifies cleanly at compact landscape height", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 932, height: 430 });
  await page.goto("/?qaEngine=tom-thumb&qaCars=3&qaStation=0&qaService=active");

  const foreground = page.locator('[data-station-foreground-index="0"]');
  await expect(foreground).toBeVisible();

  const values = await foreground.evaluate((node) => {
    const canopy = node.querySelector(".station-near-canopy");
    const platform = node.querySelector(".station-near-platform");
    return {
      canopyHeight: canopy?.getBoundingClientRect().height ?? 0,
      platformHeight: platform?.getBoundingClientRect().height ?? 0,
      foregroundBottom: window.innerHeight - node.getBoundingClientRect().bottom,
    };
  });

  expect(values.canopyHeight).toBeLessThanOrEqual(74);
  expect(values.platformHeight).toBeLessThanOrEqual(23);
  expect(values.foregroundBottom).toBeGreaterThan(0);

  const shot = await page.screenshot({ animations: "disabled", caret: "hide" });
  await testInfo.attach("stage-b-compact-landscape", { body: shot, contentType: "image/png" });
});
