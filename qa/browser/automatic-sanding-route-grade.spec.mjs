import { expect, test } from "@playwright/test";

test.describe("automatic sanding route-grade reconciliation", () => {
  test.describe.configure({ retries: 0 });

  test("uphill launch renders sanding from the same positive grade shown in the cab", async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 });
    await page.goto("/?qaEngine=southern-4501&qaCars=3&qaStation=4");

    const engine = page.locator('[data-engine-sprite="southern-4501"]');
    await expect(engine).toBeVisible({ timeout: 10_000 });

    const gradeReadout = page.getByText("GRADE", { exact: true }).locator("..").locator("strong");
    await expect(gradeReadout).toContainText("+");
    const cabGrade = Number((await gradeReadout.textContent() ?? "0").replace("%", ""));
    expect(cabGrade).toBeGreaterThan(1.5);

    await expect.poll(async () => Number(await engine.getAttribute("data-sanding-grade") ?? 0), {
      timeout: 3_000,
      message: "sanding renderer never sampled the live uphill route grade",
    }).toBeGreaterThan(1.5);

    const renderedGrade = Number(await engine.getAttribute("data-sanding-grade") ?? 0);
    expect(Math.abs(renderedGrade - cabGrade)).toBeLessThan(.11);

    await page.getByRole("button", { name: "Release train brake" }).click();
    await page.getByRole("slider", { name: "Locomotive throttle" }).fill("78");
    await expect.poll(async () => engine.getAttribute("data-sanding"), {
      timeout: 5_000,
      message: "uphill launch never opened the automatic sanders",
    }).toBe("true");
  });
});
