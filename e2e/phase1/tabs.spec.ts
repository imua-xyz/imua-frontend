/**
 * Phase 1 — Tabs & visibility (P1-4.* from bootstrap EVM spec).
 * Verifies tab sets for LST vs NST tokens and behaviour when switching tokens.
 */
import { test, expect } from "@playwright/test";
import { setupTestHarness } from "../setup/test-harness";

test.describe("Phase 1: Tabs visibility (bootstrap EVM)", () => {
  test.beforeEach(async ({ page }) => {
    await setupTestHarness(page);
  });

  test("P1-4.1 tabs for LST include Withdraw", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 60000,
    });

    // Ensure an LST token (imETH) is selected
    await page.getByTestId("token-selector-button").click();
    await expect(page.getByTestId("token-row-imETH")).toBeVisible();
    await page.getByTestId("token-row-imETH").click();

    await expect(page.getByTestId("tab-stake")).toBeVisible();
    await expect(page.getByTestId("tab-delegate")).toBeVisible();
    await expect(page.getByTestId("tab-undelegate")).toBeVisible();
    await expect(page.getByTestId("tab-withdraw")).toBeVisible();
  });

  test("P1-4.2/4.3 NST has no Withdraw tab and switching from Withdraw resets to Stake", async ({
    page,
  }) => {
    // Start with Withdraw tab selected for an LST via initialStakingTab
    await page.addInitScript(() => {
      window.localStorage.setItem("initialStakingTab", "withdraw");
    });

    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 60000,
    });

    // Confirm Withdraw tab is available for the default LST
    await expect(page.getByTestId("tab-withdraw")).toBeVisible();

    // Switch to an NST token (either nstHoodiETH or nstLocalETH depending on env)
    await page.getByTestId("token-selector-button").click();
    const nstHoodi = page.getByTestId("token-row-nstHoodiETH");
    const nstLocal = page.getByTestId("token-row-nstLocalETH");

    if (await nstHoodi.isVisible().catch(() => false)) {
      await nstHoodi.click();
    } else {
      await nstLocal.click();
    }

    // Withdraw tab should no longer be present; NST tabs should be visible
    await expect(page.getByTestId("tab-withdraw")).toHaveCount(0);
    await expect(page.getByTestId("tab-stake")).toBeVisible();
    await expect(page.getByTestId("tab-verify")).toBeVisible();
    await expect(page.getByTestId("tab-delegate")).toBeVisible();
    await expect(page.getByTestId("tab-undelegate")).toBeVisible();
  });
});

