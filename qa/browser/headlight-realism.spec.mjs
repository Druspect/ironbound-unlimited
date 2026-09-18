import { expect, test } from "@playwright/test";

const ENGINES = [
  "tom-thumb",
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

test.describe("locomotive headlight realism", () => {
  test.describe.configure({ retries: 0 });

  test("every locomotive renders a compact lamp and forward conical beam", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1365, height: 768 });

    for (const engineId of ENGINES) {
      await page.goto(`/?qaEngine=${engineId}&qaCars=3`);
      await expect(page.locator(".scene")).toBeVisible();
      const frame = page.locator(`.engine-sprite-${engineId} .engine-sprite-frame-primary`);
      await expect(frame).toBeVisible();

      const lighting = await frame.evaluate((element) => {
        const lens = getComputedStyle(element, "::before");
        const beam = getComputedStyle(element, "::after");
        const unit = element.closest(".engine-sprite-unit");
        const unitStyle = unit ? getComputedStyle(unit) : null;
        return {
          lensContent: lens.content,
          lensWidth: Number.parseFloat(lens.width),
          lensHeight: Number.parseFloat(lens.height),
          beamContent: beam.content,
          beamWidth: Number.parseFloat(beam.width),
          beamHeight: Number.parseFloat(beam.height),
          beamClipPath: beam.clipPath,
          beamOpacity: Number.parseFloat(beam.opacity),
          socketX: unitStyle?.getPropertyValue("--headlight-x").trim() ?? "",
          socketY: unitStyle?.getPropertyValue("--headlight-y").trim() ?? "",
        };
      });

      expect(lighting.lensContent).not.toBe("none");
      expect(lighting.lensWidth).toBeGreaterThanOrEqual(5);
      expect(lighting.lensWidth).toBeLessThanOrEqual(8);
      expect(lighting.lensHeight).toBeCloseTo(lighting.lensWidth, 1);
      expect(lighting.beamContent).not.toBe("none");
      expect(lighting.beamWidth).toBeGreaterThanOrEqual(300);
      expect(lighting.beamHeight).toBeGreaterThanOrEqual(58);
      expect(lighting.beamClipPath).not.toBe("none");
      expect(lighting.beamOpacity).toBeGreaterThan(0);
      expect(lighting.socketX).toMatch(/%$/);
      expect(lighting.socketY).toMatch(/%$/);
    }

    // Capture the starter at full night strength because it is the calibration
    // engine and the most visible ground-truth check for eliminating the old orb.
    await page.goto("/?qaEngine=tom-thumb&qaCars=3");
    await expect(page.locator(".scene")).toBeVisible();
    await page.evaluate(() => document.querySelector(".experience")?.classList.add("phase-night"));
    await page.waitForTimeout(120);

    const engineBox = await page.locator(".engine-sprite-tom-thumb").boundingBox();
    expect(engineBox).not.toBeNull();
    const clip = {
      x: Math.max(0, engineBox.x - 30),
      y: Math.max(0, engineBox.y - 45),
      width: Math.min(1365 - Math.max(0, engineBox.x - 30), engineBox.width + 390),
      height: Math.min(768 - Math.max(0, engineBox.y - 45), engineBox.height + 90),
    };
    const evidence = await page.screenshot({ animations: "disabled", caret: "hide", clip });
    await testInfo.attach("starter-headlight-night-current", { body: evidence, contentType: "image/png" });

    await expect(page.locator(".engine-sprite-tom-thumb .headlight-system")).toHaveCSS("display", "none");
  });
});
