import { test, expect } from "@playwright/test";
import { setupTestHarness } from "../setup/test-harness";

test.describe("Spike: Staking page loads correctly", () => {
  test.beforeEach(async ({ page }) => {
    await setupTestHarness(page);
  });

  test("staking page renders and shows connect prompt", async ({ page }) => {
    await page.goto("/staking");

    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByTestId("token-selector-button")).toBeVisible();
    await expect(page.getByTestId("connect-wallet-cta")).toBeVisible();
    await expect(page.getByText("Connect to Start Staking")).toBeVisible();
  });

  test("token selector opens and shows all tokens", async ({ page }) => {
    await page.goto("/staking");
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 30000,
    });

    await page.getByTestId("token-selector-button").click();
    await expect(page.getByText("Select a token")).toBeVisible();
    await expect(page.getByTestId("token-search-input")).toBeVisible();
    await expect(page.getByTestId("token-row-imETH")).toBeVisible();
    await expect(page.getByTestId("token-row-wstETH")).toBeVisible();
    await expect(page.getByTestId("token-row-XRP")).toBeVisible();
  });

  test("tabs are rendered for bootstrap phase", async ({ page }) => {
    await page.goto("/staking");
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 30000,
    });

    await expect(page.getByTestId("tab-stake")).toBeVisible();
    await expect(page.getByTestId("tab-delegate")).toBeVisible();
    await expect(page.getByTestId("tab-undelegate")).toBeVisible();
  });

  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Welcome to IMUA")).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText("Get started")).toBeVisible();
    await expect(page.getByText("View dashboard")).toBeVisible();
  });

  test("header elements are present", async ({ page }) => {
    await page.goto("/staking");
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 30000,
    });

    await expect(page.getByTestId("header-logo")).toBeVisible();
    await expect(page.getByTestId("nav-dashboard")).toBeVisible();
    await expect(page.getByTestId("nav-stake")).toBeVisible();
    await expect(page.getByTestId("wallet-status-button")).toBeVisible();
  });

  test("navigates from landing to staking", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Welcome to IMUA")).toBeVisible({
      timeout: 30000,
    });

    await page.getByText("Get started").click();
    await expect(page).toHaveURL(/\/staking/);
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 30000,
    });
  });
});
