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

async function savedRun(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("ironbound-save-v4");
    return raw ? JSON.parse(raw).run : null;
  });
}

test("moving-run autosave preserves live trainline and cylinder pressure across reload", async ({ page }) => {
  test.setTimeout(40_000);
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN RUN" }).click();

  await page.getByRole("button", { name: "Release train brake" }).click();
  await setRangeValue(page.locator("#throttle"), 72);
  await expect.poll(async () => Number((await page.locator(".speed-reading strong").textContent()) ?? 0), {
    timeout: 12_000,
  }).toBeGreaterThanOrEqual(12);

  await page.getByRole("button", { name: "Apply train brake" }).click();
  const experience = page.locator(".experience");
  await expect.poll(async () => Number(await experience.getAttribute("data-brake-line-pressure")), {
    timeout: 4_000,
  }).toBeGreaterThan(.45);
  await expect.poll(async () => Number(await experience.getAttribute("data-brake-cylinder-pressure")), {
    timeout: 4_000,
  }).toBeGreaterThan(.18);

  // First prove the production saver writes a braking train while it is still
  // moving. This specifically guards the old debounce-starvation defect.
  await expect.poll(async () => {
    const run = await savedRun(page);
    return Boolean(
      run &&
      run.speed > 0 &&
      run.brakeEngaged === true &&
      run.brakePressure > .4 &&
      run.brakeCylinderPressure > .15
    );
  }, { timeout: 4_000 }).toBe(true);

  // Pause through the real Store control, then let one persistence cadence
  // capture a stable mechanical state. Reload comparisons should be against
  // that stable state, not an older snapshot taken while pressure was changing.
  await page.getByRole("button", { name: "STORE" }).click();
  await page.waitForTimeout(1_150);
  const stableSaved = await savedRun(page);
  expect(stableSaved).toBeTruthy();
  expect(stableSaved.brakeEngaged).toBe(true);
  expect(stableSaved.brakePressure).toBeGreaterThan(.4);
  expect(stableSaved.brakeCylinderPressure).toBeGreaterThan(.15);

  await page.waitForTimeout(1_050);
  const secondStableSaved = await savedRun(page);
  expect(Math.abs(secondStableSaved.brakePressure - stableSaved.brakePressure)).toBeLessThan(.005);
  expect(Math.abs(secondStableSaved.brakeCylinderPressure - stableSaved.brakeCylinderPressure)).toBeLessThan(.005);

  await page.reload();
  const restoredExperience = page.locator(".experience");
  const restoredBrake = page.locator(".brake-button");
  await expect(restoredBrake).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => Number(await restoredExperience.getAttribute("data-brake-line-pressure")), {
    timeout: 4_000,
  }).toBeGreaterThan(.35);
  await expect.poll(async () => Number(await restoredExperience.getAttribute("data-brake-cylinder-pressure")), {
    timeout: 4_000,
  }).toBeGreaterThan(.12);

  const restored = {
    line: Number(await restoredExperience.getAttribute("data-brake-line-pressure")),
    cylinder: Number(await restoredExperience.getAttribute("data-brake-cylinder-pressure")),
  };
  expect(Math.abs(restored.line - secondStableSaved.brakePressure)).toBeLessThan(.01);
  expect(Math.abs(restored.cylinder - secondStableSaved.brakeCylinderPressure)).toBeLessThan(.01);
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
  await expect(experience).toHaveAttribute("data-brake-line-pressure", "1.0000");
  await expect(experience).toHaveAttribute("data-brake-cylinder-pressure", "1.0000");
});
