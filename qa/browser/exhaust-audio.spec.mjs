import { expect, test } from "@playwright/test";

async function exerciseEngine(page, engineId, expectedBeats, expectedCharacter) {
  await page.goto(`/?qaEngine=${engineId}&qaCars=3`);
  const engine = page.locator(`[data-engine-sprite="${engineId}"]`);
  await expect(engine).toBeVisible({ timeout: 10_000 });
  const exhaust = engine.locator("canvas.exhaust-smoke");
  await expect(exhaust).toHaveAttribute("data-exhaust-beats-per-revolution", String(expectedBeats));
  await expect(exhaust).toHaveAttribute("data-exhaust-character", expectedCharacter);

  await page.getByRole("button", { name: "Release train brake" }).click();
  await page.getByRole("slider", { name: "Locomotive throttle" }).fill("62");
  await expect.poll(async () => Number(await page.locator(".speed-reading strong").textContent() ?? 0), {
    timeout: 8_000,
    message: `${engineId} never developed ground speed for exhaust validation`,
  }).toBeGreaterThan(0);
  await expect.poll(async () => Number(await exhaust.getAttribute("data-exhaust-audio-events") ?? 0), {
    timeout: 8_000,
    message: `${engineId} produced no wheel-synchronized exhaust events`,
  }).toBeGreaterThan(2);

  return Number(await exhaust.getAttribute("data-exhaust-audio-events") ?? 0);
}

test.describe("mechanically synchronized exhaust audio", () => {
  test.describe.configure({ retries: 0 });

  test("conventional two-cylinder engine exposes four exhaust beats per driver revolution", async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    const events = await exerciseEngine(page, "prr-1361", 4, "balanced");
    expect(events).toBeGreaterThan(2);
  });

  test("simple articulated engine exposes eight exhaust beats per driver revolution", async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    const events = await exerciseEngine(page, "big-boy-4014", 8, "articulated");
    expect(events).toBeGreaterThan(2);
  });
});
