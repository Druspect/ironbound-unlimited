import { expect, test } from "@playwright/test";

async function openActiveService(page, stationIndex, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`/?qaEngine=tom-thumb&qaCars=6&qaStation=${stationIndex}&qaService=active`);
  await expect(page.locator("#cab")).toBeVisible();
  await expect(page.locator(".station-card")).toHaveClass(/at-platform/, { timeout: 8_000 });
  await expect(page.locator(`.station-world[data-station-index="${stationIndex}"]`))
    .toHaveAttribute("data-service-active", "true", { timeout: 8_000 });
}

const SERVICE_CASES = [
  { index: 0, station: "Cinder Flats", summary: "Passengers", steps: ["BOARD"] },
  { index: 1, station: "Copper Wash", summary: "Passengers + water", steps: ["BOARD", "WATER"] },
  { index: 3, station: "Timberline", summary: "Full fuel + water service", steps: ["BOARD", "WATER", "COAL"] },
];

test("Stage E station service types remain legible and expose only the work actually performed", async ({ page }) => {
  for (const serviceCase of SERVICE_CASES) {
    await openActiveService(page, serviceCase.index, { width: 1365, height: 768 });

    const card = page.locator(".station-card");
    await expect(card).toContainText(serviceCase.station);
    await expect(card.locator(":scope > small")).toContainText(serviceCase.summary);

    const steps = card.locator(".service-steps span");
    await expect(steps).toHaveCount(serviceCase.steps.length);
    for (let index = 0; index < serviceCase.steps.length; index += 1) {
      await expect(steps.nth(index)).toHaveText(serviceCase.steps[index]);
    }

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

    await expect.poll(async () => card.locator(".service-steps span.active").count(), {
      timeout: 8_000,
    }).toBeGreaterThan(0);

    const active = card.locator(".service-steps span.active").first();
    const activeStyle = await active.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        fontWeight: Number(style.fontWeight),
        color: style.color,
      };
    });
    expect(activeStyle.fontWeight).toBeGreaterThanOrEqual(800);
    expect(activeStyle.color).not.toBe("rgba(243, 234, 215, 0.36)");
  }
});

test("typed station service remains clear without extra stage chips in compact landscape", async ({ page }) => {
  await openActiveService(page, 3, { width: 932, height: 430 });

  const compactCard = page.locator(".station-card");
  await expect(compactCard).toContainText("Timberline");
  await expect(compactCard.locator(":scope > small")).toContainText("Full fuel + water service");

  const compactSteps = compactCard.locator(".service-steps");
  await expect(compactSteps).toBeHidden();

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
