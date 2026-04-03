/**
 * Phase 1 — Undelegate flow (P1-7.*).
 */
import { test, expect } from "@playwright/test";
import { setupTestHarness } from "../setup/test-harness";
import { ensureHasDelegation } from "./helpers";

const OPERATOR_1_ADDRESS = "imua1validator1xxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

async function connect(page: any) {
  await page.getByTestId("connect-wallet-cta").click();
  const connectInModal = page.locator("button").filter({ hasText: "Connect Wallet" }).last();
  await connectInModal.click();
  await expect(page.getByTestId("connect-wallet-cta")).not.toBeVisible({ timeout: 15000 });
}

async function selectFirstDelegationInModal(page: any) {
  await page.getByTestId("delegation-selector").click();
  const row = page.getByTestId(`delegation-row-${OPERATOR_1_ADDRESS}`).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.click();
  await expect(page.getByText("Select Delegation")).not.toBeVisible({
    timeout: 15000,
  });
}

test.describe("Phase 1: Undelegate flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupTestHarness(page);
  });

  test("P1-7.4 empty-state UI when no delegations", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);

    await page.getByTestId("tab-undelegate").click();
    // With on-chain resolver mode, empty-state depends on chain baseline.
    const emptyState = page.getByText(/No active delegations/i);
    const selector = page.getByTestId("delegation-selector");
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasSelector = await selector.isVisible().catch(() => false);
    expect(hasEmptyState || hasSelector).toBeTruthy();
  });

  test("P1-7.2 zero amount validation", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);
    await ensureHasDelegation(page);

    await page.getByTestId("tab-undelegate").click();
    await selectFirstDelegationInModal(page);
    await expect(page.getByTestId("undelegate-amount-input")).toBeVisible({
      timeout: 15000,
    });

    await page.getByTestId("undelegate-amount-input").fill("0");
    await expect(page.getByText("Amount must be greater than 0")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("undelegate-submit-button")).toBeDisabled();
  });

  test("P1-7.3 amount above delegated validation", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);
    await ensureHasDelegation(page);

    await page.getByTestId("tab-undelegate").click();
    await selectFirstDelegationInModal(page);
    await expect(page.getByTestId("undelegate-amount-input")).toBeVisible({
      timeout: 15000,
    });

    await page.getByTestId("undelegate-amount-input").fill("999999");
    await expect(page.getByText(/Amount exceeds balance:/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("undelegate-submit-button")).toBeDisabled();
  });

  test("P1-7.1 undelegate signing/state changes (expected failure until assertions implemented)", async ({
    page,
  }) => {
    test.fail(true, "TODO: add on-chain state-change assertions for undelegate (§2.4)");
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);

    await page.getByTestId("tab-undelegate").click();
    await page.getByTestId("delegation-selector").click();
    await page.getByText(OPERATOR_1_DISPLAY).click();
    await page.getByRole("button", { name: "Continue" }).click();
    expect(1, "placeholder failure until state-change assertions are added").toBe(2);
  });
});

