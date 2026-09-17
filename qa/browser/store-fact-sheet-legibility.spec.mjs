import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("locomotive cards and expanded fact sheets remain readable for the production audience", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: "OPEN STORE" }).click();

  const firstCard = page.locator(".engine-card").first();
  const cardCopy = firstCard.locator(".engine-card-copy");
  await expect(cardCopy).toBeVisible();

  const collapsedMetrics = await firstCard.evaluate((card) => {
    const secondary = card.querySelector(".engine-card-copy p");
    const heading = card.querySelector(".engine-card-copy h3");
    const secondaryStyle = secondary ? getComputedStyle(secondary) : null;
    const headingStyle = heading ? getComputedStyle(heading) : null;
    return {
      secondaryFont: secondaryStyle ? Number.parseFloat(secondaryStyle.fontSize) : 0,
      headingFont: headingStyle ? Number.parseFloat(headingStyle.fontSize) : 0,
    };
  });
  expect(collapsedMetrics.secondaryFont).toBeGreaterThanOrEqual(13.5);
  expect(collapsedMetrics.headingFont).toBeGreaterThanOrEqual(19);

  const facts = firstCard.locator(".engine-fact-sheet");
  await facts.locator("summary").click();
  await expect(facts).toHaveAttribute("open", "");

  const expandedMetrics = await facts.evaluate((sheet) => {
    const summary = sheet.querySelector("summary");
    const intro = sheet.querySelector(":scope > p");
    const row = sheet.querySelector("dl div");
    const link = sheet.querySelector("a");
    const dt = row?.querySelector("dt");
    const dd = row?.querySelector("dd");
    const summaryStyle = summary ? getComputedStyle(summary) : null;
    const introStyle = intro ? getComputedStyle(intro) : null;
    const rowStyle = row ? getComputedStyle(row) : null;
    const linkStyle = link ? getComputedStyle(link) : null;
    const dtBox = dt?.getBoundingClientRect();
    const ddBox = dd?.getBoundingClientRect();
    const sheetBox = sheet.getBoundingClientRect();
    return {
      summaryFont: summaryStyle ? Number.parseFloat(summaryStyle.fontSize) : 0,
      introFont: introStyle ? Number.parseFloat(introStyle.fontSize) : 0,
      introLineHeight: introStyle ? Number.parseFloat(introStyle.lineHeight) : 0,
      rowFont: rowStyle ? Number.parseFloat(rowStyle.fontSize) : 0,
      linkFont: linkStyle ? Number.parseFloat(linkStyle.fontSize) : 0,
      rowSeparated: Boolean(dtBox && ddBox && dtBox.right <= ddBox.left + 1),
      withinViewport: sheetBox.left >= 0 && sheetBox.right <= window.innerWidth,
    };
  });

  expect(expandedMetrics.summaryFont).toBeGreaterThanOrEqual(12);
  expect(expandedMetrics.introFont).toBeGreaterThanOrEqual(14);
  expect(expandedMetrics.introLineHeight).toBeGreaterThanOrEqual(20);
  expect(expandedMetrics.rowFont).toBeGreaterThanOrEqual(13);
  expect(expandedMetrics.linkFont).toBeGreaterThanOrEqual(11);
  expect(expandedMetrics.rowSeparated).toBe(true);
  expect(expandedMetrics.withinViewport).toBe(true);

  await mkdir("qa-artifacts/remediation", { recursive: true });
  await page.screenshot({ path: "qa-artifacts/remediation/store-fact-sheet-legibility.png", animations: "disabled" });
});
