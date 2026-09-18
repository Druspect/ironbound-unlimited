import { expect, test } from "@playwright/test";

async function openActiveService(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto("/?qaEngine=tom-thumb&qaCars=6&qaStation=0&qaService=active");
  await expect(page.locator("#cab")).toBeVisible();
  await expect(page.locator(".station-card")).toHaveClass(/at-platform/, { timeout: 8_000 });
  await expect(page.locator('.station-world[data-station-index="0"]')).toHaveAttribute("data-service-active", "true", { timeout: 8_000 });
}

test("station service stages are readable while compact landscape stays uncluttered", async ({ page }) => {
  await openActiveService(page, { width: 1365, height: 768 });

  const desktopCard = page.locator(".station-card");
  const steps = desktopCard.locator(".service-steps span");
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(0)).toHaveText("BOARD");
  await expect(steps.nth(1)).toHaveText("WATER");

  const metrics = await steps.evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node);
    const box = node.getBoundingClientRect();
    return {
      fontSize: Number.parseFloat(style.fontSize),
      height: box.height,
    };
  }));

  for (const item of metrics) {
    expect(item.fontSize).toBeGreaterThanOrEqual(10);
    expect(item.height).toBeGreaterThanOrEqual(23);
  }

  await expect.poll(async () => desktopCard.locator(".service-steps span.active").count(), {
    timeout: 8_000,
  }).toBeGreaterThan(0);

  const active = desktopCard.locator(".service-steps span.active").first();
  const activeStyle = await active.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      fontWeight: Number(style.fontWeight),
      color: style.color,
    };
  });
  expect(activeStyle.fontWeight).toBeGreaterThanOrEqual(800);
  expect(activeStyle.color).not.toBe("rgba(243, 234, 215, 0.36)");

  await openActiveService(page, { width: 932, height: 430 });
  const compactCard = page.locator(".station-card");
  const compactSteps = compactCard.locator(".service-steps");
  await expect(compactSteps).toBeHidden();

  const summary = compactCard.locator(":scope > small");
  await expect(summary).toContainText(/Boarding|service/);
  const compact = await compactCard.evaluate((node) => {
    const cardStyle = getComputedStyle(node);
    const summaryNode = node.querySelector(":scope > small");
    const summaryStyle = summaryNode ? getComputedStyle(summaryNode) : null;
    const box = node.getBoundingClientRect();
    return {
      summaryFontSize: summaryStyle ? Number.parseFloat(summaryStyle.fontSize) : 0,
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      cardDisplay: cardStyle.display,
    };
  });

  expect(compact.cardDisplay).not.toBe("none");
  expect(compact.summaryFontSize).toBeGreaterThanOrEqual(10);
  expect(compact.left).toBeGreaterThanOrEqual(0);
  expect(compact.right).toBeLessThanOrEqual(compact.viewportWidth);
  expect(compact.top).toBeGreaterThanOrEqual(0);
  expect(compact.bottom).toBeLessThanOrEqual(compact.viewportHeight);
});
