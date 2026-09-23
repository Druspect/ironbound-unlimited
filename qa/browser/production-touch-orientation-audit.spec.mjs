import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const OUTPUT = "qa-artifacts/production-state-audit/08-responsive/03-touch-portrait-gameplay.png";

test("capture the real touch-portrait gameplay boundary", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  try {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const guard = page.locator('[data-orientation-guard="blocked"]');
    await expect(guard).toBeVisible();
    await expect(guard).toContainText("Rotate to landscape");
    await expect(page.locator(".experience")).toHaveAttribute("inert", "");
    await expect(page.locator(".experience")).toHaveAttribute("aria-hidden", "true");

    await mkdir("qa-artifacts/production-state-audit/08-responsive", { recursive: true });
    await page.screenshot({ path: OUTPUT, fullPage: false, animations: "disabled", caret: "hide" });
  } finally {
    await context.close();
  }
});
