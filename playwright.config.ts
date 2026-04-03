import { defineConfig, devices } from "@playwright/test";

/**
 * When true, Playwright will NOT start `pnpm run dev:e2e` if :3000 already responds,
 * and it will NOT stop that server when tests finish — next-server keeps running.
 * Opt in with E2E_REUSE_DEV_SERVER=1 for faster reruns; default is to own the dev server.
 */
const reuseExistingDevServer =
  !process.env.CI &&
  (process.env.E2E_REUSE_DEV_SERVER === "true" ||
    process.env.E2E_REUSE_DEV_SERVER === "1");

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  timeout: 120000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    actionTimeout: 30000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "pnpm run dev:e2e",
        url: "http://localhost:3000",
        reuseExistingServer: reuseExistingDevServer,
        timeout: 120000,
        // Unix: SIGTERM to the whole process group, then Playwright force-kills if needed.
        gracefulShutdown: { signal: "SIGTERM", timeout: 15_000 },
      },
});
