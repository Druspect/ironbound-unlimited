import { expect, test } from "@playwright/test";

async function startTrain(page, engineId) {
  await page.goto(`/?qaEngine=${engineId}&qaCars=3`);
  const engine = page.locator(`[data-engine-sprite="${engineId}"]`);
  await expect(engine).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Release train brake" }).click();
  await page.getByRole("slider", { name: "Locomotive throttle" }).fill("58");
  await expect.poll(async () => Number(await page.locator(".speed-reading strong").textContent() ?? 0), { timeout: 8_000 }).toBeGreaterThan(0);
  return engine.locator(".engine-sprite-frame-primary");
}

test.describe("animation continuity", () => {
  test("mechanical sprite poses and sub-frame suspension both advance under steam", async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    const frame = await startTrain(page, "prr-1361");

    const transforms = new Set();
    const positions = new Set();
    for (let i = 0; i < 10; i += 1) {
      const sample = await frame.evaluate((element) => {
        const style = getComputedStyle(element);
        return { transform: style.transform, backgroundPosition: style.backgroundPosition };
      });
      transforms.add(sample.transform);
      positions.add(sample.backgroundPosition);
      await page.waitForTimeout(90);
    }

    expect(positions.size).toBeGreaterThan(2);
    expect(transforms.size).toBeGreaterThan(3);
  });

  test("articulated engines keep the smaller heavy-frame suspension envelope", async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    const frame = await startTrain(page, "big-boy-4014");
    const amplitudes = await frame.evaluate((element) => {
      const engine = element.closest(".engine-sprite-unit");
      const style = engine ? getComputedStyle(engine) : null;
      return {
        surge: style?.getPropertyValue("--phase-surge-amplitude").trim(),
        rise: style?.getPropertyValue("--phase-rise-amplitude").trim(),
      };
    });
    expect(amplitudes).toEqual({ surge: ".18px", rise: ".10px" });
  });

  test("reduced motion removes phase-locked chassis movement", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?qaEngine=prr-1361&qaCars=3");
    const frame = page.locator('[data-engine-sprite="prr-1361"] .engine-sprite-frame-primary');
    await expect(frame).toBeVisible({ timeout: 10_000 });
    await expect.poll(() => frame.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  });
});
