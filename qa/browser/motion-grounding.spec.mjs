import { mkdir } from "node:fs/promises";
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

test("low-speed departure advances wheels and timber smoothly instead of stepping", async ({ page }, testInfo) => {
  test.setTimeout(35_000);
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/?qaEngine=tom-thumb&qaCars=3");
  await expect(page.locator("#cab")).toBeVisible();

  await page.getByRole("button", { name: "Release train brake" }).click();
  await setRangeValue(page.locator("#throttle"), 24);
  const speed = page.locator(".speed-reading strong");
  await expect.poll(async () => Number((await speed.textContent()) ?? 0), { timeout: 10_000 }).toBeGreaterThan(.5);
  await expect.poll(async () => Number((await speed.textContent()) ?? 99), { timeout: 10_000 }).toBeLessThan(7);

  const samples = await page.evaluate(async () => {
    const root = document.querySelector(".experience");
    const ballast = document.querySelector(".ballast");
    if (!root || !ballast) return [];
    const values = [];
    const start = performance.now();
    await new Promise((resolve) => {
      const sample = () => {
        values.push({
          time: performance.now() - start,
          angle: Number(root.dataset.driverWheelAngle ?? "0"),
          frame: Number(root.dataset.engineFrame ?? "0"),
          blend: Number(root.dataset.engineFrameBlend ?? "0"),
          trackX: Number.parseFloat(root.style.getPropertyValue("--track-x") || "0"),
          ballastPosition: getComputedStyle(ballast).backgroundPosition,
        });
        if (performance.now() - start >= 850) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    return values;
  });

  expect(samples.length).toBeGreaterThan(20);
  const fractional = samples.filter((sample) => sample.blend > .03 && sample.blend < .97);
  expect(fractional.length).toBeGreaterThan(8);
  expect(new Set(fractional.map((sample) => sample.blend.toFixed(2))).size).toBeGreaterThan(5);

  const angleDeltas = [];
  const trackDeltas = [];
  for (let index = 1; index < samples.length; index += 1) {
    let angleDelta = samples[index].angle - samples[index - 1].angle;
    if (angleDelta < -180) angleDelta += 360;
    if (angleDelta > 180) angleDelta -= 360;
    angleDeltas.push(angleDelta);

    let trackDelta = samples[index].trackX - samples[index - 1].trackX;
    if (trackDelta < -16) trackDelta += 32;
    if (trackDelta > 16) trackDelta -= 32;
    trackDeltas.push(trackDelta);
  }

  expect(Math.max(...angleDeltas.map(Math.abs))).toBeLessThan(6);
  expect(Math.max(...trackDeltas.map(Math.abs))).toBeLessThan(3);
  expect(new Set(samples.map((sample) => sample.ballastPosition)).size).toBe(1);

  await mkdir("qa-artifacts/remediation", { recursive: true });
  const screenshot = await page.screenshot({
    path: "qa-artifacts/remediation/low-speed-track-wheel-continuity.png",
    animations: "allow",
  });
  await testInfo.attach("low-speed-track-wheel-continuity", { body: screenshot, contentType: "image/png" });
});

test("carriages and locomotive/tender sections have continuous visible coupling hardware", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/?qaEngine=southern-4501&qaCars=3");
  await expect(page.locator("#cab")).toBeVisible();
  await expect(page.locator(".consist-car")).toHaveCount(3);
  await expect(page.locator(".consist-coupler")).toHaveCount(2);
  await expect(page.locator(".car-end-diaphragm")).toHaveCount(2);
  await expect(page.locator(".consist-engine-coupling")).toHaveCount(1);
  await expect(page.locator(".engine-tender-drawbar")).toHaveCount(1);

  const geometry = await page.evaluate(() => {
    const cars = [...document.querySelectorAll(".consist-car")].map((node) => node.getBoundingClientRect());
    const couplers = [...document.querySelectorAll(".consist-coupler")].map((node) => node.getBoundingClientRect());
    const engineCoupling = document.querySelector(".consist-engine-coupling")?.getBoundingClientRect();
    const engine = document.querySelector(".engine-sprite-unit")?.getBoundingClientRect();
    const engineDrawbar = document.querySelector(".engine-tender-drawbar")?.getBoundingClientRect();
    return {
      carRights: cars.map((box) => box.right),
      couplers: couplers.map((box) => ({ left: box.left, right: box.right, width: box.width })),
      engineCoupling: engineCoupling ? { left: engineCoupling.left, right: engineCoupling.right, width: engineCoupling.width } : null,
      engine: engine ? { left: engine.left, right: engine.right } : null,
      engineDrawbar: engineDrawbar ? { left: engineDrawbar.left, right: engineDrawbar.right, width: engineDrawbar.width } : null,
    };
  });

  for (let index = 0; index < geometry.couplers.length; index += 1) {
    const boundary = geometry.carRights[index];
    const coupler = geometry.couplers[index];
    expect(coupler.width).toBeGreaterThan(8);
    expect(coupler.left).toBeLessThan(boundary);
    expect(coupler.right).toBeGreaterThan(boundary);
  }

  const finalBoundary = geometry.carRights.at(-1);
  expect(geometry.engineCoupling).not.toBeNull();
  expect(geometry.engine).not.toBeNull();
  expect(geometry.engineDrawbar).not.toBeNull();
  expect(geometry.engineCoupling.left).toBeLessThan(finalBoundary);
  expect(geometry.engineCoupling.right).toBeGreaterThan(finalBoundary);
  expect(geometry.engineCoupling.right).toBeGreaterThan(geometry.engine.left);
  expect(geometry.engineDrawbar.width).toBeGreaterThan(5);
  expect(geometry.engineDrawbar.left).toBeGreaterThanOrEqual(geometry.engine.left);
  expect(geometry.engineDrawbar.right).toBeLessThanOrEqual(geometry.engine.right);

  await mkdir("qa-artifacts/remediation", { recursive: true });
  const screenshot = await page.screenshot({
    path: "qa-artifacts/remediation/consist-coupling-continuity.png",
    animations: "disabled",
  });
  await testInfo.attach("consist-coupling-continuity", { body: screenshot, contentType: "image/png" });
});
