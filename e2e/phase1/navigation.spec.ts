/**
 * Phase 1 — Entry and navigation (P1-1.*).
 */
import { test, expect } from "@playwright/test";
import { setupTestHarness } from "../setup/test-harness";

test.describe("Phase 1: Entry and navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupTestHarness(page);
  });

  test("P1-1.1 landing page loads", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Welcome to IMUA" })).toBeVisible({
      timeout: 60000,
    });
    await expect(page.getByRole("link", { name: /Staking/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Dashboard/i })).toBeVisible();
  });

  test("P1-1.2 staking card navigates to /staking", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByText("Get started →").click();
    await expect(page).toHaveURL(/\/staking$/, { timeout: 15000 });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
  });

  test("P1-1.3 dashboard card navigates to /dashboard", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByText("View dashboard →").click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  });

  test("P1-1.4 header nav active state matches route", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("nav-stake")).toBeVisible({ timeout: 60000 });
    await expect(page.getByTestId("nav-stake")).toHaveClass(/text-\[#00e5ff\]/);
    await expect(page.getByTestId("nav-dashboard")).not.toHaveClass(/text-\[#00e5ff\]/);

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    // Dashboard is heavier and may render differently; assert via accessible links.
    const dashLink = page.getByRole("link", { name: "Dashboard" });
    const stakeLink = page.getByRole("link", { name: "Stake" });
    await expect(dashLink).toBeVisible({ timeout: 60000 });
    await expect(dashLink).toHaveClass(/text-\[#00e5ff\]/);
    await expect(stakeLink).toBeVisible();
    await expect(stakeLink).not.toHaveClass(/text-\[#00e5ff\]/);
  });

  test("P1-1.5 header logo links home", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await page.getByTestId("header-logo").click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Welcome to IMUA" })).toBeVisible({
      timeout: 60000,
    });
  });
});

