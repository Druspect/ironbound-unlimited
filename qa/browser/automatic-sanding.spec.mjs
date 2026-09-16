import { expect, test } from "@playwright/test";

async function readSpeed(page) {
  const text = await page.locator(".speed-reading strong").textContent();
  return Number(text ?? 0);
}

async function verifyLaunchSanding(page, engineId) {
  await page.goto(`/?qaEngine=${engineId}&qaCars=3`);
  const engine = page.locator(`[data-engine-sprite="${engineId}"]`);
  await expect(engine).toBeVisible({ timeout: 10_000 });
  await expect(engine).toHaveAttribute("data-sanding", "false");

  await page.getByRole("button", { name: "Release train brake" }).click();
  await page.getByRole("slider", { name: "Locomotive throttle" }).fill("78");

  await expect.poll(async () => engine.getAttribute("data-sanding"), {
    timeout: 5_000,
    message: `${engineId} never opened the automatic sanders during a strong low-speed launch`,
  }).toBe("true");

  const activeVisual = await engine.evaluate((element) => {
    const style = getComputedStyle(element, "::before");
    return {
      opacity: Number(style.opacity),
      width: Number.parseFloat(style.width),
      height: Number.parseFloat(style.height),
      intensity: Number.parseFloat(getComputedStyle(element).getPropertyValue("--sanding-intensity")),
    };
  });
  expect(activeVisual.opacity).toBeGreaterThan(.25);
  expect(activeVisual.width).toBeGreaterThanOrEqual(40);
  expect(activeVisual.height).toBeGreaterThanOrEqual(30);
  expect(activeVisual.intensity).toBeGreaterThan(.45);

  await expect.poll(() => readSpeed(page), {
    timeout: 10_000,
    message: `${engineId} did not accelerate through the sanding cutout speed`,
  }).toBeGreaterThan(10);
  await expect.poll(async () => engine.getAttribute("data-sanding"), {
    timeout: 2_000,
    message: `${engineId} kept sanding after the low-speed launch envelope`,
  }).toBe("false");

  const inactiveOpacity = await engine.evaluate((element) => Number(getComputedStyle(element, "::before").opacity));
  expect(inactiveOpacity).toBe(0);
}

test.describe("automatic sanding", () => {
  test.describe.configure({ retries: 0 });

  test("starter and articulated locomotive sand the rail only during a strong launch", async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await verifyLaunchSanding(page, "tom-thumb");
    await verifyLaunchSanding(page, "big-boy-4014");
  });
});
