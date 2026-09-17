import { expect, test } from "@playwright/test";

async function setRangeValue(locator, value) {
  await locator.evaluate((element, nextValue) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("range setter unavailable");
    setter.call(element, String(nextValue));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

test("moving-run autosave preserves live trainline and cylinder pressure across reload", async ({ page }) => {
  test.setTimeout(35_000);
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN RUN" }).click();

  await page.getByRole("button", { name: "Release train brake" }).click();
  await setRangeValue(page.locator("#throttle"), 72);
  await expect.poll(async () => Number((await page.locator(".speed-reading strong").textContent()) ?? 0), {
    timeout: 12_000,
  }).toBeGreaterThanOrEqual(12);

  await page.getByRole("button", { name: "Apply train brake" }).click();
  const brake = page.locator(".brake-button");
  const experience = page.locator(".experience");
  await expect.poll(async () => Number(await brake.getAttribute("data-brake-line-pressure")), {
    timeout: 4_000,
  }).toBeGreaterThan(.45);
  await expect.poll(async () => Number(await experience.getAttribute("data-brake-cylinder-pressure")), {
    timeout: 4_000,
  }).toBeGreaterThan(.18);

  const beforeReload = {
    line: Number(await brake.getAttribute("data-brake-line-pressure")),
    cylinder: Number(await experience.getAttribute("data-brake-cylinder-pressure")),
  };

  // The production saver must write while the train is still moving; this is
  // specifically the condition that the former debounce could postpone forever.
  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("ironbound-save-v4");
    if (!raw) return false;
    const run = JSON.parse(raw).run;
    return Boolean(
      run &&
      run.speed > 0 &&
      run.brakeEngaged === true &&
      run.brakePressure > .4 &&
      run.brakeCylinderPressure > .15
    );
  }), { timeout: 4_000 }).toBe(true);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ironbound-save-v4"))).then((value) => value.run);
  expect(Math.abs(saved.brakePressure - beforeReload.line)).toBeLessThan(.18);
  expect(Math.abs(saved.brakeCylinderPressure - beforeReload.cylinder)).toBeLessThan(.18);

  await page.reload();
  const restoredBrake = page.locator(".brake-button");
  const restoredExperience = page.locator(".experience");
  await expect(restoredBrake).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => Number(await restoredBrake.getAttribute("data-brake-line-pressure")), {
    timeout: 4_000,
  }).toBeGreaterThan(.35);
  await expect.poll(async () => Number(await restoredExperience.getAttribute("data-brake-cylinder-pressure")), {
    timeout: 4_000,
  }).toBeGreaterThan(.12);

  const restored = {
    line: Number(await restoredBrake.getAttribute("data-brake-line-pressure")),
    cylinder: Number(await restoredExperience.getAttribute("data-brake-cylinder-pressure")),
  };
  expect(Math.abs(restored.line - saved.brakePressure)).toBeLessThan(.03);
  expect(Math.abs(restored.cylinder - saved.brakeCylinderPressure)).toBeLessThan(.03);
});

test("legacy saves with a set brake restore to a safely held train", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("ironbound-save-v4", JSON.stringify({
      run: {
        throttle: 0,
        speed: 0,
        boilerLoad: 42,
        heat: 0,
        distance: 0,
        visualTravel: 0,
        brakeEngaged: true,
        fuel: 100,
        water: 100,
        stationsWithoutService: 0,
        failure: null,
      },
    }));
  });
  await page.goto("/");

  const brake = page.locator(".brake-button");
  const experience = page.locator(".experience");
  await expect(brake).toHaveAttribute("aria-pressed", "true");
  await expect(brake).toHaveAttribute("data-brake-line-pressure", "1.0000");
  await expect(experience).toHaveAttribute("data-brake-cylinder-pressure", "1.0000");
});
