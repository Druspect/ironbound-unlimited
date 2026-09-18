import { expect, test } from "@playwright/test";

test("starter locomotive stays clear of the cab on short landscape screens", async ({ page }) => {
  await page.setViewportSize({ width: 932, height: 430 });
  await page.goto("/?qaEngine=tom-thumb&qaCars=3");
  await expect(page.locator(".scene")).toBeVisible();
  await expect(page.locator('[data-engine-sprite="tom-thumb"]')).toBeVisible();
  await expect(page.locator("#cab")).toBeVisible();
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));

  const geometry = await page.evaluate(() => {
    const engine = document.querySelector('[data-engine-sprite="tom-thumb"]')?.getBoundingClientRect();
    const cab = document.querySelector("#cab")?.getBoundingClientRect();
    if (!engine || !cab) return null;
    return {
      engineBottom: engine.bottom,
      cabTop: cab.top,
      clearance: cab.top - engine.bottom,
      cabBottom: cab.bottom,
      viewportHeight: window.innerHeight,
    };
  });

  expect(geometry).not.toBeNull();
  expect(geometry.cabBottom).toBeLessThanOrEqual(geometry.viewportHeight + 2);
  expect(geometry.clearance).toBeGreaterThanOrEqual(-2);

  const compactTelemetry = await page.evaluate(() => {
    const group = document.querySelector(".telemetry-group");
    const resourceSpans = [...document.querySelectorAll(".resource-monitors > div > span")];
    if (!group) return null;
    return {
      groupWidth: group.getBoundingClientRect().width,
      resourceOverflow: resourceSpans.map((span) => ({
        text: span.textContent?.replace(/\s+/g, " ").trim() ?? "",
        clientWidth: span.clientWidth,
        scrollWidth: span.scrollWidth,
      })),
    };
  });
  expect(compactTelemetry).not.toBeNull();
  expect(compactTelemetry.groupWidth).toBeGreaterThanOrEqual(385);
  for (const resource of compactTelemetry.resourceOverflow) {
    expect(resource.scrollWidth, `${resource.text} must fit inside compact telemetry`).toBeLessThanOrEqual(resource.clientWidth + 1);
  }
});
