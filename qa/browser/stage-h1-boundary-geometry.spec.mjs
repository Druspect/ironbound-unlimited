import { expect, test } from "@playwright/test";

const cases = [
  { engine: "tom-thumb", cars: 3, width: 932, height: 430 },
  { engine: "tom-thumb", cars: 6, width: 1440, height: 900 },
  { engine: "big-boy-4014", cars: 3, width: 1440, height: 900 },
  { engine: "big-boy-4014", cars: 6, width: 1920, height: 1080 },
];

async function waitForEngine(page, engineId) {
  const engine = page.locator(`[data-engine-sprite="${engineId}"]`);
  await expect(engine).toBeVisible({ timeout: 10_000 });
  return engine;
}

for (const fixture of cases) {
  test(`H1 rendered boundaries remain continuous: ${fixture.engine}, ${fixture.cars} cars, ${fixture.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: fixture.width, height: fixture.height });
    await page.goto(`/?qaEngine=${fixture.engine}&qaCars=${fixture.cars}`);

    await waitForEngine(page, fixture.engine);
    await expect(page.locator(".train-kinetic")).toBeVisible();
    await expect(page.locator(".consist-car")).toHaveCount(fixture.cars);

    const geometry = await page.evaluate(() => {
      const train = document.querySelector(".train-kinetic")?.getBoundingClientRect();
      const cars = Array.from(document.querySelectorAll(".consist-car"));
      const engine = document.querySelector(".engine-sprite-unit");
      const trainStyle = getComputedStyle(document.querySelector(".train-consist"));
      const worldCoachGap = Number.parseFloat(trainStyle.getPropertyValue("--coach-coupling-gap"));
      const worldEngineGap = Number.parseFloat(trainStyle.getPropertyValue("--engine-coupling-gap"));
      const scale = Number.parseFloat(trainStyle.getPropertyValue("--camera-scale")) || 1;

      const nominalCars = cars.map((car) => ({
        left: Number.parseFloat(car.style.left || getComputedStyle(car).left),
        width: Number.parseFloat(car.style.width || getComputedStyle(car).width),
      }));
      const nominalCoachGaps = nominalCars.slice(0, -1).map((car, index) => {
        const next = nominalCars[index + 1];
        return next.left - (car.left + car.width);
      });
      const renderedCoachBoxes = cars.map((node) => node.getBoundingClientRect());
      const renderedCoachGaps = renderedCoachBoxes.slice(0, -1).map(
        (car, index) => renderedCoachBoxes[index + 1].left - car.right,
      );
      const lastCar = nominalCars.at(-1);
      const declaredEngineLeft = Number.parseFloat(trainStyle.getPropertyValue("--engine-left"));
      const computedEngineLeft = engine ? Number.parseFloat(getComputedStyle(engine).left) : Number.NaN;
      const nominalEngineGap = lastCar && Number.isFinite(declaredEngineLeft)
        ? declaredEngineLeft - (lastCar.left + lastCar.width)
        : Number.NaN;

      return {
        trainLeft: train?.left ?? Number.NaN,
        trainRight: train?.right ?? Number.NaN,
        viewportWidth: innerWidth,
        nominalCoachGaps,
        renderedCoachGaps,
        nominalEngineGap,
        declaredEngineLeft,
        computedEngineLeft,
        expectedCoachGap: worldCoachGap,
        expectedRenderedCoachGap: worldCoachGap * scale,
        expectedEngineGap: worldEngineGap,
      };
    });

    expect(geometry.trainLeft).toBeGreaterThanOrEqual(-1);
    expect(geometry.trainRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);

    for (const gap of geometry.nominalCoachGaps) {
      expect(Math.abs(gap - geometry.expectedCoachGap)).toBeLessThanOrEqual(.001);
      expect(gap).toBeGreaterThan(0);
    }

    for (const gap of geometry.renderedCoachGaps) {
      expect(Math.abs(gap - geometry.expectedRenderedCoachGap)).toBeLessThanOrEqual(1.25);
      expect(gap).toBeGreaterThan(0);
    }

    expect(Math.abs(geometry.declaredEngineLeft - geometry.computedEngineLeft)).toBeLessThanOrEqual(.01);
    expect(Math.abs(geometry.nominalEngineGap - geometry.expectedEngineGap)).toBeLessThanOrEqual(.001);
    expect(geometry.nominalEngineGap).toBeGreaterThan(0);
  });
}
