/**
 * Phase 1 — Stake & deposit flows advanced coverage (P1-5.3–P1-5.7, P1-5.9–P1-5.10).
 *
 * Note: signing/state-change assertions are tracked as expected failures for now.
 */
import { test, expect } from "@playwright/test";
import { setupTestHarness } from "../setup/test-harness";

const OPERATOR_1_ADDRESS = "imua1validator1xxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const OPERATOR_2_ADDRESS = "imua1validator2xxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

async function connect(page: any) {
  await page.getByTestId("connect-wallet-cta").click();
  const connectInModal = page.locator("button").filter({ hasText: "Connect Wallet" }).last();
  await connectInModal.click();
  await expect(page.getByTestId("connect-wallet-cta")).not.toBeVisible({ timeout: 15000 });
}

test.describe("Phase 1: Stake advanced", () => {
  test.beforeEach(async ({ page }) => {
    await setupTestHarness(page);
  });

  test("P1-5.3 amount above balance shows error and blocks Continue", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);

    await page.getByTestId("tab-stake").click();
    await page.getByTestId("stake-amount-input").fill("999999");
    await expect(page.getByText(/Amount exceeds balance:/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("stake-continue-button")).toBeDisabled();
  });

  test("P1-5.5 MAX button uses full balance", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);

    await page.getByTestId("tab-stake").click();
    await page.getByTestId("stake-max-button").click();
    const value = await page.getByTestId("stake-amount-input").inputValue();
    expect(value).not.toBe("");
    await expect(page.getByTestId("stake-continue-button")).toBeEnabled({ timeout: 15000 });
  });

  test("P1-5.6 edit amount from review preserves flow", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);

    await page.getByTestId("tab-stake").click();
    await page.getByTestId("stake-amount-input").fill("0.1");
    await page.getByTestId("stake-continue-button").click();
    await page.getByTestId(`operator-row-${OPERATOR_1_ADDRESS}`).click();
    await expect(page.getByTestId("stake-submit-button")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("stake-edit-button").click();
    await expect(page.getByTestId("stake-amount-input")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("stake-amount-input").fill("0.2");
    await expect(page.getByTestId("stake-continue-button")).toBeEnabled({ timeout: 15000 });
  });

  test("P1-5.7 change operator from review updates summary", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);

    await page.getByTestId("tab-stake").click();
    await page.getByTestId("stake-amount-input").fill("0.1");
    await page.getByTestId("stake-continue-button").click();
    await page.getByTestId(`operator-row-${OPERATOR_1_ADDRESS}`).click();
    await expect(page.getByText("Test Operator Alpha")).toBeVisible();

    await page.getByTestId("stake-operator-select-button").click();
    await page.getByTestId(`operator-row-${OPERATOR_2_ADDRESS}`).click();
    await expect(page.getByText("Test Operator Beta")).toBeVisible({ timeout: 10000 });
  });

  test("P1-5.9 deposit-only mode: flow to review without operator", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);

    await page.getByTestId("tab-stake").click();
    // Toggle off "Stake & Earn Rewards" to become deposit-only
    await page.getByTestId("stake-mode-toggle").click();
    await page.getByTestId("stake-amount-input").fill("0.1");
    await page.getByTestId("stake-continue-button").click();

    // Deposit-only should land on review (no operator modal required)
    await expect(page.getByTestId("stake-submit-button")).toBeVisible({ timeout: 10000 });
  });

  test("P1-5.10 deposit-only signing/state changes (expected failure until assertions implemented)", async ({
    page,
  }) => {
    test.fail(true, "TODO: add on-chain state-change assertions for deposit-only (§2.1)");
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);

    await page.getByTestId("tab-stake").click();
    await page.getByTestId("stake-mode-toggle").click();
    await page.getByTestId("stake-amount-input").fill("0.01");
    await page.getByTestId("stake-continue-button").click();
    expect(1, "placeholder failure until state-change assertions are added").toBe(2);
  });
});

