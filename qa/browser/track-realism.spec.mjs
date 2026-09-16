import { expect, test } from "@playwright/test";

test.describe("track realism gate", () => {
  // Geometry validation must pass on its first staged fixture. A retry would
  // conceal lifecycle races and weaken this as a physical-contact gate.
  test.describe.configure({ retries: 0 });

  test("realistic track section preserves rail hierarchy and wheel contact", async ({ page }, testInfo) => {
    const viewport = { width: 1365, height: 768 };
    await page.setViewportSize(viewport);
    await page.goto("/?qaEngine=tom-thumb&qaCars=6&qaStation=0");
    await expect(page.locator(".scene")).toBeVisible();
    await expect(page.locator(".consist-car")).toHaveCount(6);
    await expect(page.locator(".consist-car .small-wheel")).toHaveCount(24);
    await expect(page.locator(".track")).toBeVisible();
    await expect(page.locator(".rail-near")).toBeVisible();
    await expect(page.locator(".rail-far")).toBeVisible();
    await expect(page.locator(".ballast")).toBeVisible();
    await expect(page.locator(".sleepers")).toBeVisible();
    await page.waitForFunction(() => [...document.images].every((image) => image.complete));
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".track")).getPropertyValue("--track-standard-gauge-in").trim() === "56.5");

    const section = await page.evaluate(() => {
      const track = document.querySelector(".track");
      const near = document.querySelector(".rail-near");
      const far = document.querySelector(".rail-far");
      const ballast = document.querySelector(".ballast");
      const sleepers = document.querySelector(".sleepers");
      const cab = document.querySelector(".cab");
      const wheels = [...document.querySelectorAll(".consist-car .small-wheel")];
      if (!track || !near || !far || !ballast || !sleepers || !cab) {
        return { ready: false, reason: "track layer missing", wheelCount: wheels.length };
      }

      const trackStyle = getComputedStyle(track);
      const nearBox = near.getBoundingClientRect();
      const farBox = far.getBoundingClientRect();
      const ballastBox = ballast.getBoundingClientRect();
      const sleeperBox = sleepers.getBoundingClientRect();
      const cabBox = cab.getBoundingClientRect();
      const wheelGaps = wheels.map((wheel) => Math.abs(wheel.getBoundingClientRect().bottom - nearBox.top));

      return {
        ready: wheels.length === 24,
        reason: wheels.length === 24 ? null : `expected 24 carriage wheels, found ${wheels.length}`,
        wheelCount: wheels.length,
        railCount: track.querySelectorAll(":scope > .rail").length,
        tiePitchPx: Number.parseFloat(trackStyle.getPropertyValue("--track-tie-pitch")),
        tieFacePx: Number.parseFloat(trackStyle.getPropertyValue("--track-tie-face")),
        motionPeriodPx: Number.parseFloat(trackStyle.getPropertyValue("--track-motion-period")),
        gaugeInches: Number.parseFloat(trackStyle.getPropertyValue("--track-standard-gauge-in")),
        near: { top: nearBox.top, bottom: nearBox.bottom, height: nearBox.height },
        far: { top: farBox.top, bottom: farBox.bottom, height: farBox.height },
        ballast: { top: ballastBox.top, bottom: ballastBox.bottom, height: ballastBox.height },
        sleepers: { top: sleeperBox.top, bottom: sleeperBox.bottom, height: sleeperBox.height },
        cab: { top: cabBox.top },
        maxWheelGap: Math.max(...wheelGaps),
        railTopSeparation: nearBox.top - farBox.top,
        sleeperZ: Number.parseInt(getComputedStyle(sleepers).zIndex, 10),
        nearRailZ: Number.parseInt(getComputedStyle(near).zIndex, 10),
        ballastZ: Number.parseInt(getComputedStyle(ballast).zIndex, 10),
        tieSeatShadowDisabled: getComputedStyle(track, "::after").content === "none",
      };
    });

    expect(section.ready, section.reason ?? "track fixture did not stage").toBe(true);
    expect(section.wheelCount).toBe(24);
    expect(section.railCount).toBe(2);
    expect(section.gaugeInches).toBe(56.5);
    expect(section.tiePitchPx).toBe(32);
    expect(section.tieFacePx).toBe(15);
    expect(section.motionPeriodPx % section.tiePitchPx).toBe(0);

    // Ground-truth cross-section: the near running section remains heavier than
    // the perspective rail, but neither is thick enough to read as a shelf.
    expect(section.near.height).toBeCloseTo(6, 1);
    expect(section.far.height).toBeCloseTo(3, 1);
    expect(section.railTopSeparation).toBeGreaterThanOrEqual(14);
    expect(section.railTopSeparation).toBeLessThanOrEqual(18);
    expect(section.maxWheelGap).toBeLessThanOrEqual(.75);
    expect(section.tieSeatShadowDisabled).toBe(true);

    expect(section.sleepers.height).toBeGreaterThan(20);
    expect(section.ballast.height).toBeGreaterThanOrEqual(28);
    expect(section.ballast.height).toBeLessThanOrEqual(32);
    // Ballast must begin materially below the near running surface. This is the
    // key anti-shelf invariant: rail and timber remain readable above the crown.
    expect(section.ballast.top).toBeGreaterThan(section.far.top);
    expect(section.ballast.top).toBeGreaterThanOrEqual(section.near.bottom + 5);
    expect(section.ballast.top).toBeLessThanOrEqual(section.near.bottom + 16);
    expect(section.ballastZ).toBeLessThan(section.sleeperZ);
    expect(section.sleeperZ).toBeLessThan(section.nearRailZ);

    // The control console must not mask the physical rail section.
    expect(section.cab.top - section.near.bottom).toBeGreaterThanOrEqual(18);
    expect(section.cab.top - section.far.top).toBeGreaterThanOrEqual(28);

    // Capture only the visible physical railway above the fixed cab. The PNG is
    // retained as human-review evidence even while baseline promotion is pending.
    const trackBox = await page.locator(".track").boundingBox();
    expect(trackBox).not.toBeNull();
    const x = Math.max(0, trackBox.x);
    const y = Math.max(0, trackBox.y);
    const right = Math.min(viewport.width, trackBox.x + trackBox.width);
    const bottom = Math.min(viewport.height, trackBox.y + trackBox.height, section.cab.top - 1);
    const clip = { x, y, width: right - x, height: bottom - y };
    expect(clip.width).toBeGreaterThan(1000);
    expect(clip.height).toBeGreaterThan(40);

    const trackEvidence = await page.screenshot({
      animations: "disabled",
      caret: "hide",
      clip,
    });
    await testInfo.attach("track-section-current", {
      body: trackEvidence,
      contentType: "image/png",
    });

    await expect(page).toHaveScreenshot("track-section-1365x768.png", {
      animations: "disabled",
      caret: "hide",
      clip,
    });
  });
});
