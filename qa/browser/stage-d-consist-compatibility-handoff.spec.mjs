import { expect, test } from "@playwright/test";

const HANDOFFS = [
  { id: "southern-4501", label: "Southern Railway • Early Heavyweight" },
  { id: "atsf-3751", label: "Santa Fe • Interwar Heavyweight" },
  { id: "big-boy-4014", label: "Union Pacific • Late Steam Passenger" },
];

const CUSTOM_CONSIST = [
  "baggage-mail",
  "day-coach",
  "dining-car",
  "pullman",
  "observation-car",
  "day-coach",
];

async function equipEngine(page, engineId) {
  await page.getByRole("button", { name: "ENGINES" }).click();
  const card = page.locator(`.engine-card:has(img[src*="${engineId}.webp"])`);
  await expect(card).toBeVisible();
  await card.locator(":scope > button").click();
  await expect(card).toHaveClass(/equipped/);
}

async function carriageValues(page) {
  return page.locator(".consist-list select").evaluateAll((selects) =>
    selects.map((select) => select.value),
  );
}

test("live engine handoffs preserve a valid consist while compatibility identity changes", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?reviewFleet=1");
  await page.getByRole("button", { name: "OPEN STORE" }).click();

  await page.getByRole("button", { name: "CARRIAGES" }).click();
  const add = page.getByRole("button", { name: "ADD CAR" });
  await add.click();
  await add.click();
  await add.click();
  await expect(page.locator(".consist-list select")).toHaveCount(6);

  const selects = page.locator(".consist-list select");
  for (let index = 0; index < CUSTOM_CONSIST.length; index += 1) {
    await selects.nth(index).selectOption(CUSTOM_CONSIST[index]);
  }
  expect(await carriageValues(page)).toEqual(CUSTOM_CONSIST);

  for (const handoff of HANDOFFS) {
    await equipEngine(page, handoff.id);
    await page.getByRole("button", { name: "CARRIAGES" }).click();

    await expect(page.getByRole("heading", { name: "Build Your Train" })).toBeVisible();
    await expect(page.locator(".department-heading p")).toContainText(handoff.label);
    await expect(page.locator(".consist-toolbar strong")).toHaveText("6 CARS");

    const values = await carriageValues(page);
    expect(values).toEqual(CUSTOM_CONSIST);

    const optionCounts = await page.locator(".consist-list select").evaluateAll((nodes) =>
      nodes.map((node) => node.options.length),
    );
    expect(optionCounts).toEqual([5, 5, 5, 5, 5, 5]);

    await page.getByRole("button", { name: "TAKE THIS TRAIN" }).click();
    await expect(page.locator(`[data-engine-sprite="${handoff.id}"]`)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".consist-car")).toHaveCount(6);

    await page.getByRole("button", { name: "STORE" }).click();
  }
});
