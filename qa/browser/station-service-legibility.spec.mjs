import { expect, test } from "@playwright/test";

async function openActiveService(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto("/?qaEngine=tom-thumb&qaCars=6&qaStation=0&qaService=active");
  await expect(page.locator("#cab")).toBeVisible();
  await expect(page.locator(".station-card")).toHaveClass(/at-platform/, { timeout: 8_000 });
  await expect(page.locator('.station-world[data-station-index="0"]')).toHaveAttribute("data-service-active", "true", { timeout: 8_000 });
}

test("station service stages remain readable without expanding the HUD footprint", async ({ page }) => {
  for (const viewport of [
    { width: 1365, height: 768 },
    { width: 932, height: 430 },
  ]) {
    await openActiveService(page, viewport);

    const card = page.locator(".station-card");
    const steps = card.locator(".service-steps span");
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toHaveText("BOARD");
    await expect(steps.nth(1)).toHaveText("WATER");

    const metrics = await steps.evaluateAll((nodes) => nodes.map((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return {
        fontSize: Number.parseFloat(style.fontSize),
        height: box.height,
        color: style.color,
        background: style.backgroundImage !== "none" ? style.backgroundImage : style.backgroundColor,
      };
    }));

    for (const item of metrics) {
      expect(item.fontSize).toBeGreaterThanOrEqual(10);
      expect(item.height).toBeGreaterThanOrEqual(23);
    }

    await expect.poll(async () => card.locator(".service-steps span.active").count(), {
      timeout: 8_000,
    }).toBeGreaterThan(0);

    const active = card.locator(".service-steps span.active").first();
    const activeStyle = await active.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        fontWeight: Number(style.fontWeight),
        color: style.color,
        borderColor: style.borderColor,
      };
    });
    expect(activeStyle.fontWeight).toBeGreaterThanOrEqual(800);
    expect(activeStyle.color).not.toBe("rgba(243, 234, 215, 0.36)");

    const geometry = await card.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  }
});
