import { expect, test } from "@playwright/test";

const cases = [
  { engine: "tom-thumb", cars: 3, width: 932, height: 430 },
  { engine: "tom-thumb", cars: 6, width: 1440, height: 900 },
  { engine: "big-boy-4014", cars: 3, width: 1440, height: 900 },
  { engine: "big-boy-4014", cars: 6, width: 1920, height: 1080 },
];

for (const fixture of cases) {
  test(`H1 rendered boundaries remain continuous: ${fixture.engine}, ${fixture.cars} cars, ${fixture.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: fixture.width, height: fixture.height });
    await page.goto(`/?qaEngine=${fixture.engine}&qaCars=${fixture.cars}`);

    await expect(page.locator(".train-kinetic")).toBeVisible();
    await expect(page.locator(".consist-car")).toHaveCount(fixture.cars);

    const geometry = await page.evaluate(() => {
      const train = document.querySelector(".train-kinetic")?.getBoundingClientRect();
      const cars = Array.from(document.querySelectorAll(".consist-car")).map((node) => node.getBoundingClientRect());
      const engine = document.querySelector(".engine-sprite-unit")?.getBoundingClientRect();
      const trainStyle = getComputedStyle(document.querySelector(".train-consist"));
      const worldCoachGap = Number.parseFloat(trainStyle.getPropertyValue("--coach-coupling-gap"));
      const worldEngineGap = Number.parseFloat(trainStyle.getPropertyValue("--engine-coupling-gap"));
      const scale = Number.parseFloat(trainStyle.getPropertyValue("--camera-scale")) || 1;

      const coachGaps = cars.slice(0, -1).map((car, index) => cars[index + 1].left - car.right);
      const engineGap = cars.length && engine ? engine.left - cars.at(-1).right : Number.NaN;

      return {
        trainLeft: train?.left ?? Number.NaN,
        trainRight: train?.right ?? Number.NaN,
        viewportWidth: innerWidth,
        coachGaps,
        engineGap,
        expectedCoachGap: worldCoachGap * scale,
        expectedEngineGap: worldEngineGap * scale,
      };
    });

    expect(geometry.trainLeft).toBeGreaterThanOrEqual(-1);
    expect(geometry.trainRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);

    for (const gap of geometry.coachGaps) {
      expect(Math.abs(gap - geometry.expectedCoachGap)).toBeLessThanOrEqual(1.25);
      expect(gap).toBeGreaterThan(0);
    }

    expect(Math.abs(geometry.engineGap - geometry.expectedEngineGap)).toBeLessThanOrEqual(1.5);
    expect(geometry.engineGap).toBeGreaterThan(0);
  });
}
