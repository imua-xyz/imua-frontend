/**
 * Phase 1 — Operator Selection Modal (P1-8.* from bootstrap EVM spec).
 * Uses GraphQL fixture GetBootstrapValidators for operator list (imua1validator1..., imua1validator2...).
 */
import { test, expect } from "@playwright/test";
import { setupTestHarness } from "../setup/test-harness";

const OPERATOR_1_ADDRESS = "imua1validator1xxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const OPERATOR_2_ADDRESS = "imua1validator2xxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

test.describe("Phase 1: Operator Selection Modal", () => {
  test.beforeEach(async ({ page }) => {
    await setupTestHarness(page);
  });

  test("P1-8.1 open operator modal from Stake tab", async ({ page }) => {
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

    await expect(page.getByTestId("operator-search-input")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByTestId(`operator-row-${OPERATOR_1_ADDRESS}`),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByTestId(`operator-row-${OPERATOR_2_ADDRESS}`),
    ).toBeVisible({ timeout: 5000 });
  });

  test("P1-8.2 search by operator name", async ({ page }) => {
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

    await expect(page.getByTestId("stake-amount-input")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("stake-amount-input").fill("0.1");
    await expect(page.getByTestId("stake-continue-button")).toBeEnabled({
      timeout: 15000,
    });
    await page.getByTestId("stake-continue-button").click();
    await expect(page.getByTestId("operator-search-input")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("operator-search-input").fill("Alpha");
    await expect(
      page.getByTestId(`operator-row-${OPERATOR_1_ADDRESS}`),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByTestId(`operator-row-${OPERATOR_2_ADDRESS}`),
    ).not.toBeVisible();
  });

  test("P1-8.3 search by operator address fragment", async ({ page }) => {
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

    await expect(page.getByTestId("stake-amount-input")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("stake-amount-input").fill("0.1");
    await expect(page.getByTestId("stake-continue-button")).toBeEnabled({
      timeout: 15000,
    });
    await page.getByTestId("stake-continue-button").click();
    await expect(page.getByTestId("operator-search-input")).toBeVisible({
      timeout: 10000,
    });

    // Use a fragment of the operator address
    const addressFragment = OPERATOR_1_ADDRESS.slice(0, 15);
    await page.getByTestId("operator-search-input").fill(addressFragment);
    await expect(
      page.getByTestId(`operator-row-${OPERATOR_1_ADDRESS}`),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByTestId(`operator-row-${OPERATOR_2_ADDRESS}`),
    ).not.toBeVisible();
  });

  test("P1-8.4 no results — nonexistent operator", async ({ page }) => {
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

    await expect(page.getByTestId("stake-amount-input")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("stake-amount-input").fill("0.1");
    await expect(page.getByTestId("stake-continue-button")).toBeEnabled({
      timeout: 15000,
    });
    await page.getByTestId("stake-continue-button").click();
    await expect(page.getByTestId("operator-search-input")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("operator-search-input").fill("NONEXISTENTXYZ");
    await expect(
      page.getByText("No operators found matching your search"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("P1-8.1b select via row click updates selection", async ({ page }) => {
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

    await expect(page.getByTestId("stake-amount-input")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("stake-amount-input").fill("0.1");
    await expect(page.getByTestId("stake-continue-button")).toBeEnabled({
      timeout: 15000,
    });
    await page.getByTestId("stake-continue-button").click();
    await expect(
      page.getByTestId(`operator-row-${OPERATOR_1_ADDRESS}`),
    ).toBeVisible({ timeout: 20000 });
    await page.getByTestId(`operator-row-${OPERATOR_1_ADDRESS}`).click();

    await expect(page.getByText("Select a token")).not.toBeVisible();
    await expect(page.getByText("Test Operator Alpha")).toBeVisible({
      timeout: 5000,
    });
  });

  test("P1-8.5 cancel without selecting preserves previous state", async ({
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

    await expect(page.getByTestId("stake-amount-input")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("stake-amount-input").fill("0.1");
    await expect(page.getByTestId("stake-continue-button")).toBeEnabled({
      timeout: 15000,
    });
    await page.getByTestId("stake-continue-button").click();
    await expect(page.getByTestId("operator-search-input")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("operator-cancel-button").click();
    await expect(page.getByTestId("operator-search-input")).not.toBeVisible({
      timeout: 3000,
    });
    await expect(page.getByTestId("stake-continue-button")).toBeVisible();
  });
});
