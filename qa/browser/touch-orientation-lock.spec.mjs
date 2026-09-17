import { expect, test } from "@playwright/test";

test("touch portrait blocks play and rotating landscape restores the paused railway", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  try {
    await page.goto("/");
    const guard = page.locator('[data-orientation-guard="blocked"]');
    await expect(guard).toBeVisible();
    await expect(guard).toContainText("Rotate to landscape");
    await expect(page.locator(".experience")).toHaveAttribute("inert", "");
    await expect(page.locator(".experience")).toHaveAttribute("aria-hidden", "true");

    await page.setViewportSize({ width: 932, height: 430 });
    await expect(guard).toHaveCount(0);
    await expect(page.locator(".experience")).not.toHaveAttribute("inert", "");
    await page.getByRole("button", { name: "BEGIN RUN" }).click();
    await expect(page.locator("#cab")).toBeVisible();
    await expect(page.locator(".experience")).not.toHaveClass(/is-paused/);

    await page.setViewportSize({ width: 430, height: 932 });
    await expect(page.locator('[data-orientation-guard="blocked"]')).toBeVisible();
    await expect(page.locator(".shell-options")).toBeVisible();
    await expect(page.locator(".experience")).toHaveClass(/is-paused/);
    await expect(page.locator(".experience")).toHaveAttribute("inert", "");

    await page.setViewportSize({ width: 932, height: 430 });
    await expect(page.locator('[data-orientation-guard="blocked"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Settings & Options" })).toBeVisible();
    await page.getByRole("button", { name: "RETURN TO RUN" }).click();
    await expect(page.locator("#cab")).toBeVisible();
    await expect(page.locator(".experience")).not.toHaveClass(/is-paused/);
  } finally {
    await context.close();
  }
});

test("non-touch portrait remains available for desktop-sized browser workflows", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    isMobile: false,
    hasTouch: false,
  });
  const page = await context.newPage();

  try {
    await page.goto("/");
    await expect(page.locator('[data-orientation-guard="blocked"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "BEGIN RUN" })).toBeVisible();
  } finally {
    await context.close();
  }
});
