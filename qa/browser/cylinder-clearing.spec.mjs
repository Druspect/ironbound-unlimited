import { expect, test } from "@playwright/test";

async function readSpeed(page) {
  const text = await page.locator(".speed-reading strong").textContent();
  return Number(text ?? 0);
}

async function exerciseDeparture(page, engineId) {
  await page.goto(`/?qaEngine=${engineId}&qaCars=3`);
  const engine = page.locator(`[data-engine-sprite="${engineId}"]`);
  await expect(engine).toBeVisible({ timeout: 10_000 });
  await expect(engine).toHaveAttribute("data-cylinder-clearing", "false");

  await page.getByRole("button", { name: "Release train brake" }).click();
  await page.getByRole("slider", { name: "Locomotive throttle" }).fill("58");

  await expect(engine).toHaveAttribute("data-cylinder-clearing", "true", { timeout: 3_000 });
  if (engineId === "tom-thumb") {
    const starterVent = engine.locator(".steam-vent");
    await expect.poll(() => starterVent.evaluate((element) => getComputedStyle(element).animationName))
      .toContain("production-cylinder-clearing");
  } else {
    await expect.poll(() => engine.evaluate((element) => getComputedStyle(element, "::after").animationName))
      .toContain("production-cylinder-clearing");
  }

  await expect.poll(() => readSpeed(page), {
    timeout: 8_000,
    message: `${engineId} did not accelerate beyond the cylinder-clearing envelope`,
  }).toBeGreaterThan(8);
  await expect(engine).toHaveAttribute("data-cylinder-clearing", "false", { timeout: 2_000 });
}

test.describe("cylinder clearing", () => {
  test.describe.configure({ retries: 0 });

  test("starter and heavy locomotive clear cylinders only during low-speed departure", async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await exerciseDeparture(page, "tom-thumb");
    await exerciseDeparture(page, "big-boy-4014");
  });
});
