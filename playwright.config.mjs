import { defineConfig, devices } from "@playwright/test";

const updatingBaselines = process.env.UPDATE_VISUAL_BASELINES === "1";

export default defineConfig({
  testDir: "./qa/browser",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.008,
      threshold: 0.18,
    },
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: "qa-artifacts/playwright-report", open: "never" }]]
    : "list",
  outputDir: "qa-artifacts/test-results",
  snapshotPathTemplate: "{testDir}/snapshots/{arg}{ext}",
  updateSnapshots: updatingBaselines ? "all" : "none",
  use: {
    baseURL: process.env.IRONBOUND_BASE_URL ?? "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    launchOptions: {
      args: ["--enable-precise-memory-info"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.IRONBOUND_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 4173",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
