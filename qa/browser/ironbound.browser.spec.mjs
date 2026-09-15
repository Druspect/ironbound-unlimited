import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

async function waitForScene(page) {
  await expect(page.locator(".scene")).toBeVisible();
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  await page.evaluate(async () => { await document.fonts?.ready; });
}

async function freezeVisualMotion(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-play-state: paused !important;
        transition: none !important;
        caret-color: transparent !important;
      }
      .exhaust-smoke, .whistle-steam, .steam-vent { opacity: 0 !important; }
    `,
  });
  await page.waitForTimeout(120);
}

async function setRangeValue(locator, value) {
  await locator.evaluate((element, nextValue) => {
    element.value = String(nextValue);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function sampleAnimationPerformance(page, durationMs = 4_000) {
  return page.evaluate((sampleDurationMs) => new Promise((resolve) => {
    const frames = [];
    const start = performance.now();
    const initialHeap = performance.memory?.usedJSHeapSize ?? null;
    let previous = start;
    let longTaskMs = 0;
    let observer = null;

    if (globalThis.PerformanceObserver?.supportedEntryTypes?.includes("longtask")) {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longTaskMs += entry.duration;
      });
      observer.observe({ entryTypes: ["longtask"] });
    }

    const finish = (now) => {
      observer?.disconnect();
      const sorted = [...frames].sort((a, b) => a - b);
      const meanFrameMs = frames.reduce((sum, value) => sum + value, 0) / Math.max(1, frames.length);
      const medianFrameMs = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .50))] ?? 0;
      const p95FrameMs = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))] ?? 0;
      const maxFrameMs = sorted.at(-1) ?? 0;
      const jankThresholdMs = Math.max(100, medianFrameMs * 2.5);
      const jankFrames = frames.filter((value) => value > jankThresholdMs).length;
      const finalHeap = performance.memory?.usedJSHeapSize ?? null;
      resolve({
        durationMs: now - start,
        frameCount: frames.length,
        averageFps: meanFrameMs > 0 ? 1000 / meanFrameMs : 0,
        meanFrameMs,
        medianFrameMs,
        p95FrameMs,
        maxFrameMs,
        jankThresholdMs,
        jankRatio: jankFrames / Math.max(1, frames.length),
        longTaskMs,
        heapStartMiB: initialHeap === null ? null : initialHeap / 1024 / 1024,
        heapUsedMiB: finalHeap === null ? null : finalHeap / 1024 / 1024,
        heapGrowthMiB: initialHeap === null || finalHeap === null ? null : (finalHeap - initialHeap) / 1024 / 1024,
        domNodes: document.querySelectorAll("*").length,
      });
    };

    const tick = (now) => {
      frames.push(now - previous);
      previous = now;
      if (now - start >= sampleDurationMs) finish(now);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), durationMs);
}

test("compact-landscape real browser acceptance passes", async ({ page }) => {
  await page.setViewportSize({ width: 932, height: 430 });
  await page.goto("/?qaSuite=p1");

  const acceptance = page.locator('[data-browser-acceptance="passed"]');
  await expect(acceptance).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-check="failed"]')).toHaveCount(0);

  // The in-app acceptance journey intentionally finishes inside the Store.
  // Return to the playable scene before measuring the cab; otherwise the test
  // measures obscured background geometry rather than the compact game layout.
  await page.getByRole("button", { name: "Return to railway" }).click();
  await expect(page.locator("#cab")).toBeVisible();

  const viewport = page.viewportSize();
  const cabBox = await page.locator("#cab").boundingBox();
  expect(cabBox).not.toBeNull();
  expect(cabBox.y + cabBox.height).toBeLessThanOrEqual(viewport.height + 2);
});

test("desktop journey reaches store, consist, audio, settings, and returns to the railway", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN RUN" }).click();
  await waitForScene(page);

  await page.getByRole("button", { name: "STORE" }).click();
  await expect(page.getByRole("button", { name: "CARRIAGES" })).toBeVisible();
  await page.getByRole("button", { name: "CARRIAGES" }).click();
  await expect(page.getByRole("heading", { name: "Build Your Train" })).toBeVisible();
  await expect(page.locator(".store-department .department-heading")).toContainText("Ironbound Heritage");
  await expect(page.locator(".store-department .department-heading")).toContainText("Early Heavyweight");
  await expect(page.locator(".consist-list select").first().locator('option[value="observation-car"]')).toHaveCount(1);

  const addCar = page.getByRole("button", { name: "ADD CAR" });
  if (await addCar.isEnabled()) await addCar.click();
  await expect(page.locator(".consist-list article")).toHaveCount(4);

  await page.getByRole("button", { name: "AUDIO PACKS" }).click();
  await expect(page.getByRole("heading", { name: "Audio Packs" })).toBeVisible();
  await expect(page.locator("[data-audio-pack]")).toHaveCount(3);
  await expect(page.locator(".audio-packs .department-heading")).toContainText("Engine analogue:");
  await expect(page.locator(".audio-packs .department-heading")).toContainText("not exact archival recordings");

  await page.getByRole("button", { name: "Return to railway" }).click();
  await page.getByRole("button", { name: "OPTIONS" }).click();
  await expect(page.getByRole("heading", { name: "Settings & Options" })).toBeVisible();
  const interfaceScale = page.locator('.scale-option input[type="range"]');
  await expect(interfaceScale).toBeVisible();
  const scaleBox = await interfaceScale.boundingBox();
  expect(scaleBox).not.toBeNull();
  expect(scaleBox.height).toBeGreaterThanOrEqual(20);
  await page.getByRole("button", { name: "RETURN TO RUN" }).click();
  await expect(page.locator("#cab")).toBeVisible();
});

test("station berthing and track perspective match the approved visual baseline", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/?qaEngine=tom-thumb&qaCars=6&qaStation=0&qaService=active");
  await waitForScene(page);
  await freezeVisualMotion(page);

  const station = page.locator('.station-world[data-station-index="0"]');
  const cars = page.locator(".consist-car");
  await expect(station).toBeVisible();
  await expect(cars).toHaveCount(6);

  const geometry = await page.evaluate(() => {
    const platform = document.querySelector('.station-world[data-station-index="0"]')?.getBoundingClientRect();
    const renderedCars = [...document.querySelectorAll(".consist-car")].map((element) => element.getBoundingClientRect());
    if (!platform || renderedCars.length !== 6) return null;
    return {
      platform: { left: platform.left, right: platform.right, width: platform.width },
      train: { left: renderedCars[0].left, right: renderedCars.at(-1).right },
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry.platform.left).toBeLessThanOrEqual(geometry.train.left + 2);
  expect(geometry.platform.right).toBeGreaterThanOrEqual(geometry.train.right - 2);

  await expect(page.locator(".scene")).toHaveScreenshot("station-berthing-1365x768.png", {
    animations: "disabled",
    caret: "hide",
  });
});

test("six animated cars stay within environment-normalized performance budgets", async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1365, height: 768 });
  await page.goto("/?qaEngine=tom-thumb&qaCars=6");
  await waitForScene(page);
  await expect(page.locator(".consist-car")).toHaveCount(6);

  // First measure the exact same six-car scene while stationary. Hosted CI can
  // throttle headless Chromium far below desktop refresh rates, so this gives
  // us the runner's real rendering ceiling before adding train-motion work.
  await page.waitForTimeout(800);
  const baseline = await sampleAnimationPerformance(page, 4_000);

  const releaseBrake = page.getByRole("button", { name: "Release train brake" });
  if (await releaseBrake.isVisible()) await releaseBrake.click();
  await setRangeValue(page.locator("#throttle"), 72);
  await expect(page.locator("#throttle")).toHaveValue("72");
  await expect(page.locator(".brake-button")).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => Number((await page.locator(".speed-card .speed-reading strong").textContent()) ?? 0), {
    message: "six-car performance sample must begin after the train is moving",
    timeout: 8_000,
  }).toBeGreaterThan(1);
  const speedAtSampleStartMph = Number((await page.locator(".speed-card .speed-reading strong").textContent()) ?? 0);

  const moving = await sampleAnimationPerformance(page, 4_000);
  const requiredMovingFps = Math.min(30, baseline.averageFps * .70);
  const environment = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemoryGiB: navigator.deviceMemory ?? null,
    devicePixelRatio: window.devicePixelRatio,
  }));
  const performanceReport = {
    environment: { ...environment, ci: Boolean(process.env.CI) },
    motionProof: {
      requestedThrottlePercent: 72,
      brakeReleased: true,
      speedAtSampleStartMph,
    },
    baseline,
    moving,
    derivedMetrics: {
      fpsRetention: baseline.averageFps > 0 ? moving.averageFps / baseline.averageFps : 0,
      p95Inflation: baseline.p95FrameMs > 0 ? moving.p95FrameMs / baseline.p95FrameMs : 0,
      additionalLongTaskMs: moving.longTaskMs - baseline.longTaskMs,
      heapEndDeltaMiB: baseline.heapUsedMiB === null || moving.heapUsedMiB === null
        ? null
        : moving.heapUsedMiB - baseline.heapUsedMiB,
    },
    derivedBudgets: {
      requiredMovingFps,
      minimumFrameRetention: .70,
      maximumP95FrameMs: Math.max(150, baseline.p95FrameMs * 1.75),
      maximumJankRatio: Math.max(.18, baseline.jankRatio + .10),
      maximumAdditionalLongTaskMs: 900,
      maximumHeapMiB: 220,
      maximumHeapGrowthMiB: 64,
      maximumDomNodes: 2_500,
    },
  };
  const serializedReport = `${JSON.stringify(performanceReport, null, 2)}\n`;

  // Persist the report outside Playwright's internal attachment structure so
  // the Actions artifact always exposes the measurements as a plain JSON file.
  await mkdir("qa-artifacts", { recursive: true });
  await writeFile("qa-artifacts/performance-budget.json", serializedReport, "utf8");
  await test.info().attach("performance-budget.json", {
    body: Buffer.from(serializedReport),
    contentType: "application/json",
  });
  console.log(
    `[performance] baseline=${baseline.averageFps.toFixed(2)}fps moving=${moving.averageFps.toFixed(2)}fps ` +
    `retention=${(performanceReport.derivedMetrics.fpsRetention * 100).toFixed(1)}% ` +
    `speed=${speedAtSampleStartMph}mph p95=${moving.p95FrameMs.toFixed(1)}ms heap=${moving.heapUsedMiB?.toFixed(1) ?? "n/a"}MiB`,
  );

  // The baseline itself must be healthy enough to make comparison meaningful.
  expect(baseline.frameCount).toBeGreaterThanOrEqual(20);
  expect(baseline.averageFps).toBeGreaterThanOrEqual(5);

  // On a normal runner this still requires 30 FPS. On a throttled hosted runner
  // it requires the moving scene to retain at least 70% of that runner's own
  // idle six-car cadence rather than failing on infrastructure limitations.
  expect(moving.averageFps).toBeGreaterThanOrEqual(requiredMovingFps);
  expect(moving.frameCount).toBeGreaterThanOrEqual(Math.floor(baseline.frameCount * .70));
  expect(moving.p95FrameMs).toBeLessThanOrEqual(Math.max(150, baseline.p95FrameMs * 1.75));
  expect(moving.jankRatio).toBeLessThanOrEqual(Math.max(.18, baseline.jankRatio + .10));
  expect(moving.longTaskMs).toBeLessThanOrEqual(baseline.longTaskMs + 900);
  expect(moving.domNodes).toBeLessThanOrEqual(2_500);
  if (moving.heapUsedMiB !== null) expect(moving.heapUsedMiB).toBeLessThanOrEqual(220);
  if (moving.heapGrowthMiB !== null) expect(moving.heapGrowthMiB).toBeLessThanOrEqual(64);
});
