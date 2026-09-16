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
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator(".experience")).toBeVisible();
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  await page.getByRole("button", { name: "BEGIN RUN" }).click();
  await page.waitForTimeout(250);
  await mkdir("qa-artifacts/production-state-audit/08-responsive", { recursive: true });
  await page.screenshot({ path: OUTPUT, fullPage: false, animations: "disabled", caret: "hide" });
  await context.close();
});
