/**
 * Phase 1 — LST Staking flow (P1-5.*): amount → operator → review.
 * Mock connector may or may not sign real txs; we assert UI states and record outcome.
 */
import { test, expect } from "@playwright/test";
import { setupTestHarness } from "../setup/test-harness";

const OPERATOR_1_ROW = "imua1validator1xxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

test.describe("Phase 1: LST Stake flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupTestHarness(page);
  });

  test("P1-5.1 stake flow — connect, amount, operator, continue to review", async ({
    page,
  }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 60000,
    });

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

    await expect(page.getByTestId("tab-stake")).toBeVisible();
    await page.getByTestId("tab-stake").click();

    await expect(page.getByTestId("stake-amount-input")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("stake-amount-input").fill("0.1");
    await expect(page.getByTestId("stake-continue-button")).toBeEnabled({
      timeout: 15000,
    });
    await page.getByTestId("stake-continue-button").click();

    await expect(
      page.getByTestId(`operator-row-${OPERATOR_1_ROW}`),
    ).toBeVisible({ timeout: 20000 });
    await page.getByTestId(`operator-row-${OPERATOR_1_ROW}`).click();

    await expect(page.getByTestId("stake-submit-button")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Test Operator Alpha")).toBeVisible();
  });

  test("P1-5.2 stake zero amount — button disabled", async ({
    page,
  }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 60000,
    });

    await page.getByTestId("connect-wallet-cta").click();
    const connectInModal = page
      .locator("button")
      .filter({ hasText: "Connect Wallet" })
      .last();
    await connectInModal.click();
    await expect(page.getByTestId("connect-wallet-cta")).not.toBeVisible({
      timeout: 15000,
    });

    await page.getByTestId("tab-stake").click();
    await expect(page.getByTestId("stake-amount-input")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("stake-amount-input").fill("0");

    const continueBtn = page.getByTestId("stake-continue-button");
    await expect(continueBtn).toBeVisible({ timeout: 5000 });
    await expect(continueBtn).toBeDisabled();
  });
});
