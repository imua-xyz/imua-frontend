/**
 * Phase 1 — Token Selector (P1-3.* from bootstrap EVM spec).
 */
import { test, expect } from "@playwright/test";
import { setupTestHarness } from "../setup/test-harness";

test.describe("Phase 1: Token Selector", () => {
  test.beforeEach(async ({ page }) => {
    await setupTestHarness(page);
  });

  test("P1-3.1 open token selector and see all tokens", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 60000,
    });

    await page.getByTestId("token-selector-button").click();
    await expect(page.getByText("Select a token")).toBeVisible();
    await expect(page.getByTestId("token-search-input")).toBeVisible();
    await expect(page.getByTestId("token-row-imETH")).toBeVisible();
    await expect(page.getByTestId("token-row-wstETH")).toBeVisible();
    await expect(page.getByTestId("token-row-XRP")).toBeVisible();
  });

  test("P1-3.2 search by name — Wrapped shows wstETH", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 60000,
    });

    await page.getByTestId("token-selector-button").click();
    await expect(page.getByTestId("token-search-input")).toBeVisible();
    await page.getByTestId("token-search-input").fill("Wrapped");
    await expect(page.getByTestId("token-row-wstETH")).toBeVisible();
    await expect(page.getByTestId("token-row-imETH")).not.toBeVisible();
  });

  test("P1-3.3 search by symbol — XRP", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 60000,
    });

    await page.getByTestId("token-selector-button").click();
    await page.getByTestId("token-search-input").fill("XRP");
    await expect(page.getByTestId("token-row-XRP")).toBeVisible();
  });

  test("P1-3.4 no search results — NONEXISTENT", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 60000,
    });

    await page.getByTestId("token-selector-button").click();
    await page.getByTestId("token-search-input").fill("NONEXISTENT");
    await expect(page.getByText(/No tokens found matching/)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("token-row-imETH")).not.toBeVisible();
  });

  test("P1-3.5 select token — modal closes and context updates", async ({
    page,
  }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 60000,
    });

    await page.getByTestId("token-selector-button").click();
    await expect(page.getByTestId("token-row-wstETH")).toBeVisible();
    await page.getByTestId("token-row-wstETH").click();
    await expect(page.getByText("Select a token")).not.toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("token-selector-button")).toContainText(
      "wstETH",
    );
  });

  test("P1-3.6 selected token indicated when reopening selector", async ({
    page,
  }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 60000,
    });

    // Select wstETH
    await page.getByTestId("token-selector-button").click();
    await expect(page.getByTestId("token-row-wstETH")).toBeVisible();
    await page.getByTestId("token-row-wstETH").click();

    // Reopen selector and verify wstETH row is marked as selected
    await page.getByTestId("token-selector-button").click();
    const wstRow = page.getByTestId("token-row-wstETH");
    await expect(wstRow).toBeVisible();
    await expect(wstRow).toHaveClass(/bg-\[#222233\]/);
  });

  test("P1-3.7 switch token mid-flow resets stake amount context", async ({
    page,
  }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 60000,
    });

    // Connect wallet first so Stake tab and amount input are enabled
    await page.getByTestId("connect-wallet-cta").click();
    const connectInModal = page
      .locator("button")
      .filter({ hasText: "Connect Wallet" })
      .last();
    await expect(connectInModal).toBeVisible({ timeout: 5000 });
    await connectInModal.click();
    await expect(page.getByTestId("connect-wallet-cta")).not.toBeVisible({
      timeout: 15000,
    });

    await page.getByTestId("tab-stake").click();
    const amountInput = page.getByTestId("stake-amount-input");
    await expect(amountInput).toBeVisible({ timeout: 10000 });
    await amountInput.fill("0.1");

    // Switch token via selector
    await page.getByTestId("token-selector-button").click();
    await page.getByTestId("token-row-wstETH").click();

    // Stake amount input should be reset for the new token context
    await page.getByTestId("tab-stake").click();
    await expect(page.getByTestId("stake-amount-input")).toHaveValue("");
  });
});
