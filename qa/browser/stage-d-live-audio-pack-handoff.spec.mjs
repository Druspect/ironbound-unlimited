import { expect, test } from "@playwright/test";

const PACKS = [
  { id: "heritage-steam", name: "Heritage Steam", asset: "/assets/audio/heritage-steam-loop.wav" },
  { id: "mountain-echo", name: "Mountain Echo", asset: "/assets/audio/mountain-echo-loop.wav" },
  { id: "winter-limited", name: "Winter Limited", asset: "/assets/audio/winter-limited-loop.wav" },
];

async function rootAudioState(page) {
  return page.evaluate(() => ({
    pack: document.documentElement.dataset.soundscapeAudioPack ?? "",
    asset: document.documentElement.dataset.soundscapeAudioAsset ?? "",
    ready: document.documentElement.dataset.soundscapeAudioReady ?? "",
    whistle: document.documentElement.dataset.whistleAudioAsset ?? "",
  }));
}

test("audio packs switch live without corrupting locomotive audio identity", async ({ page }) => {
  test.setTimeout(75_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?qaEngine=nw-1218&qaCars=3");

  const engine = page.locator('[data-engine-sprite="nw-1218"]');
  await expect(engine).toBeVisible();
  await expect(engine.locator("canvas.exhaust-smoke")).toHaveAttribute("data-exhaust-audio-ready", "true", { timeout: 8_000 });
  await expect.poll(async () => (await rootAudioState(page)).ready, { timeout: 8_000 }).toBe("true");
  const whistleAsset = (await rootAudioState(page)).whistle;
  expect(whistleAsset).toContain("whistle-articulated-freight.wav");

  await page.getByRole("button", { name: "Release train brake" }).click();
  await page.locator("#throttle").fill("58");
  await expect.poll(async () => Number((await page.locator(".speed-reading strong").textContent()) ?? 0), {
    timeout: 10_000,
  }).toBeGreaterThan(0);

  for (let index = 0; index < PACKS.length; index += 1) {
    const pack = PACKS[index];
    await page.getByRole("button", { name: "STORE" }).click();
    await page.getByRole("button", { name: "AUDIO PACKS" }).click();

    const card = page.locator(`[data-audio-pack="${pack.id}"]`);
    await expect(card).toBeVisible();
    if (!(await card.evaluate((element) => element.classList.contains("installed")))) {
      await card.locator("button").click();
    }

    await expect(card).toHaveClass(/installed/);
    await expect(page.locator(".audio-now-playing strong")).toHaveText(pack.name);
    await expect.poll(async () => (await rootAudioState(page)).pack).toBe(pack.id);
    await expect.poll(async () => (await rootAudioState(page)).asset).toBe(pack.asset);
    await expect.poll(async () => (await rootAudioState(page)).ready, { timeout: 8_000 }).toBe("true");

    await page.getByRole("button", { name: "Return to railway" }).click();
    await expect(engine).toBeVisible();
    await expect(engine.locator("canvas.exhaust-smoke")).toHaveAttribute("data-exhaust-audio-ready", "true");
    const live = await rootAudioState(page);
    expect(live.pack).toBe(pack.id);
    expect(live.asset).toBe(pack.asset);
    expect(live.ready).toBe("true");
    expect(live.whistle).toBe(whistleAsset);
  }
});
