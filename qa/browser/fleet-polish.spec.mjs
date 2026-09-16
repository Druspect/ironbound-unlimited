import { expect, test } from "@playwright/test";

const ENGINES = [
  "southern-4501",
  "prr-1361",
  "nkp-765",
  "atsf-3751",
  "nw-611",
  "up-844",
  "nw-1218",
  "challenger-3985",
  "big-boy-4014",
  "the-flyer-1907",
  "polar-express-1225",
];

const ALL_ENGINES = ["tom-thumb", ...ENGINES];
const ARTICULATED = new Set(["nw-1218", "challenger-3985", "big-boy-4014"]);

async function waitForEngine(page, engineId) {
  const engine = page.locator(`[data-engine-sprite="${engineId}"]`);
  await expect(engine).toBeVisible({ timeout: 10_000 });
  return engine;
}

async function readSpeed(page) {
  const text = await page.locator(".speed-reading strong").textContent();
  return Number(text ?? 0);
}

test.describe("fleet polish", () => {
  test.describe.configure({ retries: 0 });

  test("every locomotive releases its brake, accepts steam, and accelerates", async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });

    for (const engineId of ALL_ENGINES) {
      await page.goto(`/?qaEngine=${engineId}&qaCars=3`);
      await waitForEngine(page, engineId);
      await expect(page.getByRole("button", { name: "Release train brake" })).toBeVisible();
      await page.getByRole("button", { name: "Release train brake" }).click();
      await page.getByRole("slider", { name: "Locomotive throttle" }).fill("58");
      await expect.poll(() => readSpeed(page), {
        timeout: 8_000,
        message: `${engineId} never accelerated after brake release and working steam`,
      }).toBeGreaterThan(0);
      await expect(page.getByRole("slider", { name: "Locomotive throttle" })).toHaveAttribute("aria-valuetext", "WORKING STEAM");
    }
  });

  test("reviewFleet session lets Dad inspect all engines without granting permanent ownership", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?reviewFleet=1");
    await page.getByRole("button", { name: "OPEN STORE" }).click();
    await expect(page.locator(".engine-card")).toHaveCount(12);

    const engineButtons = page.locator(".engine-card > button");
    await expect(engineButtons).toHaveCount(12);
    expect(await engineButtons.evaluateAll((buttons) => buttons.filter((button) => button.disabled).length)).toBe(0);

    const bigBoy = page.locator('.engine-card:has(img[src*="big-boy-4014.webp"])');
    await bigBoy.locator(":scope > button").click();
    await expect(bigBoy).toHaveClass(/equipped/);
    await expect(page.locator(".shop-balance strong")).toHaveText("0");
    await page.getByRole("button", { name: "Return to railway" }).click();
    await waitForEngine(page, "big-boy-4014");

    // Review selection is intentionally not ownership. Removing the query and
    // reloading the saved game must fall back to the starter at zero bonds.
    await page.goto("/");
    await page.getByRole("button", { name: "BEGIN RUN" }).click();
    await waitForEngine(page, "tom-thumb");
  });

  test("every non-starter locomotive receives family-correct structural underframe mass", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1365, height: 768 });

    for (const engineId of ENGINES) {
      await page.goto(`/?qaEngine=${engineId}&qaCars=3`);
      const engine = await waitForEngine(page, engineId);
      const style = await engine.evaluate((element) => {
        const pseudo = getComputedStyle(element, "::before");
        return {
          content: pseudo.content,
          backgroundImage: pseudo.backgroundImage,
          opacity: Number(pseudo.opacity),
          transform: getComputedStyle(element).transform,
        };
      });

      expect(style.content).not.toBe("none");
      expect(style.backgroundImage).toContain("gradient");
      expect(style.opacity).toBeGreaterThan(.65);
      if (ARTICULATED.has(engineId)) expect(style.backgroundImage).toContain("radial-gradient");

      // Capture representative family members for human inspection without
      // introducing another binary baseline dependency.
      if (["prr-1361", "nw-1218", "big-boy-4014", "the-flyer-1907"].includes(engineId)) {
        const box = await engine.boundingBox();
        expect(box).not.toBeNull();
        const y = box.y + box.height * .55;
        const height = Math.max(1, Math.min(box.height * .45, 768 - y));
        const evidence = await page.screenshot({
          clip: { x: Math.max(0, box.x), y: Math.max(0, y), width: Math.min(box.width, 1365 - Math.max(0, box.x)), height },
          animations: "disabled",
          caret: "hide",
        });
        await testInfo.attach(`undercarriage-${engineId}`, { body: evidence, contentType: "image/png" });
      }
    }
  });

  test("carriage store changes and persists one coherent livery across the consist", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "BEGIN RUN" }).click();
    await expect(page.locator(".train-consist")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "STORE" }).click();
    await page.getByRole("button", { name: "CARRIAGES" }).click();
    await expect(page.getByRole("heading", { name: "Build Your Train" })).toBeVisible();

    const selector = page.getByRole("combobox", { name: "Passenger carriage color" });
    await expect(selector).toBeVisible();
    await expect(selector.locator("option")).toHaveCount(6);

    await selector.selectOption("tuscan-red");
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.carriageLivery)).toBe("tuscan-red");

    const previewFilters = await page.locator(".consist-car-preview img").evaluateAll((images) =>
      images.map((image) => getComputedStyle(image).filter),
    );
    expect(previewFilters.length).toBeGreaterThanOrEqual(3);
    expect(new Set(previewFilters).size).toBe(1);
    expect(previewFilters[0]).not.toBe("none");

    await page.getByRole("button", { name: "TAKE THIS TRAIN" }).click();
    await expect(page.locator(".train-consist")).toBeVisible();
    const runningFilters = await page.locator(".passenger-body").evaluateAll((images) =>
      images.map((image) => getComputedStyle(image).filter),
    );
    expect(runningFilters.length).toBeGreaterThanOrEqual(3);
    expect(new Set(runningFilters).size).toBe(1);
    expect(runningFilters[0]).not.toBe("none");

    const evidence = await page.screenshot({ animations: "disabled", caret: "hide" });
    await testInfo.attach("tuscan-red-consist", { body: evidence, contentType: "image/png" });

    await page.reload();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.carriageLivery)).toBe("tuscan-red");
  });
});
