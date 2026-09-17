import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("overheat safety lock is visually unmistakable without obscuring the railway", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("ironbound-save-v4", JSON.stringify({
      bonds: 0,
      ownedEngines: ["tom-thumb"],
      equippedEngine: "tom-thumb",
      consistCars: ["pullman", "day-coach", "baggage-mail"],
      cameraZoom: "auto",
      settings: { sound: false, reducedMotion: false, highContrast: false, uiScale: 100 },
      run: {
        throttle: 100,
        speed: 30,
        boilerLoad: 100,
        heat: 100,
        distance: 0,
        visualTravel: 0,
        brakeEngaged: false,
        fuel: 100,
        water: 100,
        stationsWithoutService: 0,
        failure: null,
      },
    }));
  });
  await page.reload();
  await page.getByRole("button", { name: "BEGIN RUN" }).click();

  const experience = page.locator(".experience");
  await expect(experience).toHaveClass(/is-overloaded/, { timeout: 8_000 });
  await expect(page.locator(".heat-monitor strong")).toHaveText("SAFETY LOCK");
  await expect(page.locator("#cab")).toBeVisible();
  await expect(page.locator(".train-consist")).toBeVisible();

  const presentation = await page.evaluate(() => {
    const speedCard = document.querySelector(".speed-card");
    const heatMonitor = document.querySelector(".heat-monitor");
    const statusDot = document.querySelector(".speed-card .status-line i");
    const vignette = document.querySelector(".vignette");
    if (!speedCard || !heatMonitor || !statusDot || !vignette) return null;
    const speedStyle = getComputedStyle(speedCard);
    const heatStyle = getComputedStyle(heatMonitor);
    const dotStyle = getComputedStyle(statusDot);
    const vignetteStyle = getComputedStyle(vignette);
    return {
      speedBorder: speedStyle.borderRightColor,
      heatOutline: heatStyle.outlineColor,
      dotWidth: Number.parseFloat(dotStyle.width),
      dotShadow: dotStyle.boxShadow,
      vignetteShadow: vignetteStyle.boxShadow,
    };
  });

  expect(presentation).not.toBeNull();
  expect(presentation.speedBorder).not.toBe("rgba(0, 0, 0, 0)");
  expect(presentation.heatOutline).not.toBe("rgba(0, 0, 0, 0)");
  expect(presentation.dotWidth).toBeGreaterThanOrEqual(8);
  expect(presentation.dotShadow).not.toBe("none");
  expect(presentation.vignetteShadow).not.toBe("none");

  await mkdir("qa-artifacts", { recursive: true });
  const screenshot = await page.screenshot({ animations: "disabled", caret: "hide" });
  await testInfo.attach("safety-lock-salience", { body: screenshot, contentType: "image/png" });
});
