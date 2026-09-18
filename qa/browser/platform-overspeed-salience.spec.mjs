import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const GAME = { width: 1365, height: 768 };
const CINDER_FLATS_TRAVEL = 943;

async function seedOverspeedPlatform(page) {
  await page.setViewportSize(GAME);
  await page.addInitScript(({ travel }) => {
    localStorage.setItem("ironbound-save-v4", JSON.stringify({
      bonds: 0,
      ownedEngines: ["tom-thumb"],
      equippedEngine: "tom-thumb",
      consistCars: ["pullman", "day-coach", "baggage-mail"],
      cameraZoom: "auto",
      settings: { sound: false, reducedMotion: false, highContrast: false, uiScale: 100 },
      run: {
        throttle: 0,
        speed: 8,
        boilerLoad: 42,
        heat: 0,
        distance: travel,
        visualTravel: travel,
        brakeEngaged: false,
        brakePressure: 0,
        brakeCylinderPressure: 0,
        fuel: 100,
        water: 100,
        stationsWithoutService: 0,
        failure: null,
      },
    }));
  }, { travel: CINDER_FLATS_TRAVEL });
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN RUN" }).click();
  await expect(page.locator("#cab")).toBeVisible();
}

test("platform overspeed correction is prominent and clears when service speed is reached", async ({ page }) => {
  test.setTimeout(30_000);
  await seedOverspeedPlatform(page);

  const stationCard = page.locator(".station-card");
  const correction = stationCard.locator("small");
  await expect(stationCard).toHaveClass(/at-platform/, { timeout: 6_000 });
  await expect(correction).toHaveText("Brake below 3 MPH");

  const warningStyle = await stationCard.evaluate((element) => {
    const cardStyle = getComputedStyle(element);
    const message = element.querySelector("small");
    const messageStyle = message ? getComputedStyle(message) : null;
    return {
      borderWidth: Number.parseFloat(cardStyle.borderLeftWidth),
      messageSize: messageStyle ? Number.parseFloat(messageStyle.fontSize) : 0,
      messageWeight: messageStyle ? Number.parseInt(messageStyle.fontWeight, 10) : 0,
      messageColor: messageStyle?.color ?? "",
    };
  });

  expect(warningStyle.borderWidth).toBeGreaterThanOrEqual(3);
  expect(warningStyle.messageSize).toBeGreaterThanOrEqual(13);
  expect(warningStyle.messageWeight).toBeGreaterThanOrEqual(700);
  expect(warningStyle.messageColor).not.toBe("rgba(243, 234, 215, 0.68)");

  await mkdir("qa-artifacts/remediation", { recursive: true });
  await page.screenshot({ path: "qa-artifacts/remediation/platform-overspeed.png", animations: "disabled" });

  await page.getByRole("button", { name: "Apply train brake" }).click();
  await expect.poll(async () => Number((await page.locator(".speed-reading strong").textContent()) ?? 99), {
    timeout: 12_000,
  }).toBeLessThan(3);
  await expect(correction).toContainText(/Boarding|Passengers aboard/, { timeout: 8_000 });
});
