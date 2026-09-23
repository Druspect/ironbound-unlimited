import { expect, test } from "@playwright/test";

const ENGINES = [
  { id: "tom-thumb", whistle: "whistle-early-passenger.wav", exhaust: "light", beats: "4" },
  { id: "southern-4501", whistle: "whistle-freight.wav", exhaust: "heavy", beats: "4" },
  { id: "prr-1361", whistle: "whistle-high-speed-passenger.wav", exhaust: "balanced", beats: "4" },
  { id: "nkp-765", whistle: "whistle-freight.wav", exhaust: "heavy", beats: "4" },
  { id: "atsf-3751", whistle: "whistle-high-speed-passenger.wav", exhaust: "balanced", beats: "4" },
  { id: "nw-611", whistle: "whistle-high-speed-passenger.wav", exhaust: "balanced", beats: "4" },
  { id: "up-844", whistle: "whistle-high-speed-passenger.wav", exhaust: "balanced", beats: "4" },
  { id: "nw-1218", whistle: "whistle-articulated-freight.wav", exhaust: "articulated", beats: "8" },
  { id: "challenger-3985", whistle: "whistle-articulated-freight.wav", exhaust: "articulated", beats: "8" },
  { id: "big-boy-4014", whistle: "whistle-articulated-freight.wav", exhaust: "articulated", beats: "8" },
  { id: "the-flyer-1907", whistle: "whistle-early-passenger.wav", exhaust: "light", beats: "4" },
  { id: "polar-express-1225", whistle: "whistle-winter-excursion.wav", exhaust: "heavy", beats: "4" },
];

async function openStore(page, firstPass) {
  const label = firstPass ? "OPEN STORE" : "STORE";
  await page.getByRole("button", { name: label }).click();
  await expect(page.locator(".engine-card")).toHaveCount(12);
}

test("all locomotive runtime identities survive repeated in-session handoffs", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?reviewFleet=1");
  await openStore(page, true);

  for (let index = 0; index < ENGINES.length; index += 1) {
    const profile = ENGINES[index];
    const card = page.locator(`.engine-card:has(img[src*="${profile.id}.webp"])`);
    await expect(card).toBeVisible();
    await card.locator(":scope > button").click();
    await expect(card).toHaveClass(/equipped/);
    await expect(page.locator(".shop-balance strong")).toHaveText("0");

    await page.getByRole("button", { name: "Return to railway" }).click();

    const engine = page.locator(`[data-engine-sprite="${profile.id}"]`);
    await expect(engine).toBeVisible({ timeout: 10_000 });

    const exhaust = engine.locator("canvas.exhaust-smoke");
    await expect(exhaust).toHaveAttribute("data-exhaust-character", profile.exhaust);
    await expect(exhaust).toHaveAttribute("data-exhaust-beats-per-revolution", profile.beats);
    await expect(exhaust).toHaveAttribute("data-exhaust-audio-ready", "true", { timeout: 8_000 });

    await expect.poll(
      () => page.evaluate(() => document.documentElement.dataset.whistleAudioReady ?? "missing"),
      { timeout: 8_000, message: `${profile.id} whistle did not become ready after live handoff` },
    ).toBe("true");

    const whistleAsset = await page.evaluate(() => document.documentElement.dataset.whistleAudioAsset ?? "");
    expect(whistleAsset).toBe(`/assets/audio/${profile.whistle}`);

    if (index < ENGINES.length - 1) await openStore(page, false);
  }
});
