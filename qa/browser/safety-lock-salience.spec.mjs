import { expect, test } from "@playwright/test";

test("safety lock is visually unmistakable without obscuring the railway", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("ironbound-save-v4", JSON.stringify({
      run: {
        throttle: 100,
        speed: 34,
        boilerLoad: 100,
        heat: 100,
        distance: 4,
        visualTravel: 4700,
        brakeEngaged: false,
        fuel: 100,
        water: 100,
        stationsWithoutService: 0,
        failure: null,
        claimedStops: [],
        servicedStationSequence: -1,
      },
    }));
  });
  await page.reload();
  await page.getByRole("button", { name: "BEGIN RUN" }).click();

  const experience = page.locator(".experience");
  const speedCard = page.locator(".speed-card");
  const heatMonitor = page.locator(".heat-monitor");
  const statusLine = page.locator(".status-line");
  const scene = page.locator(".scene");

  await expect(experience).toHaveClass(/is-overloaded/, { timeout: 5_000 });
  await expect(statusLine).toContainText("SAFETY LOCK");
  await expect(heatMonitor).toContainText("SAFETY LOCK");
  await expect(scene).toBeVisible();

  const visual = await page.evaluate(() => {
    const speed = getComputedStyle(document.querySelector(".speed-card"));
    const heat = getComputedStyle(document.querySelector(".heat-monitor"));
    const status = getComputedStyle(document.querySelector(".status-line"));
    const dot = getComputedStyle(document.querySelector(".status-line i"));
    return {
      speedBackground: speed.backgroundImage,
      speedBorder: speed.borderRightColor,
      heatBorder: heat.borderTopColor,
      heatBackground: heat.backgroundImage,
      statusWeight: Number(status.fontWeight),
      dotWidth: parseFloat(dot.width),
      dotShadow: dot.boxShadow,
    };
  });

  expect(visual.speedBackground).not.toBe("none");
  expect(visual.heatBackground).not.toBe("none");
  expect(visual.statusWeight).toBeGreaterThanOrEqual(800);
  expect(visual.dotWidth).toBeGreaterThanOrEqual(8);
  expect(visual.dotShadow).not.toBe("none");

  const cab = await page.locator("#cab").boundingBox();
  const train = await page.locator(".train-consist").boundingBox();
  expect(cab).not.toBeNull();
  expect(train).not.toBeNull();
  expect(train.y + train.height).toBeLessThanOrEqual(cab.y + 2);
});

test("normal running does not inherit safety-lock emphasis", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/?qaEngine=tom-thumb&qaCars=3");
  await expect(page.locator(".scene")).toBeVisible();
  await expect(page.locator(".experience")).not.toHaveClass(/is-overloaded/);
  await expect(page.locator(".status-line")).not.toContainText("SAFETY LOCK");
});
