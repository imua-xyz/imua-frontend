/**
 * Phase 1 — Delegate flow (P1-6.*).
 */
import { test, expect } from "@playwright/test";
import { setupTestHarness } from "../setup/test-harness";
import { ensureHasClaimableBalance } from "./helpers";

const OPERATOR_1_ADDRESS = "imua1validator1xxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

async function connect(page: any) {
  await page.getByTestId("connect-wallet-cta").click();
  const connectInModal = page.locator("button").filter({ hasText: "Connect Wallet" }).last();
  await connectInModal.click();
  await expect(page.getByTestId("connect-wallet-cta")).not.toBeVisible({ timeout: 15000 });
}

test.describe("Phase 1: Delegate flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupTestHarness(page);
  });

  test("P1-6.2 zero amount validation", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);
    await ensureHasClaimableBalance(page);

    await page.getByTestId("tab-delegate").click();
    await page.getByTestId("delegate-amount-input").fill("0");
    await expect(page.getByText("Amount must be greater than 0")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  test("P1-6.3 amount above available delegation", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);
    await ensureHasClaimableBalance(page);

    await page.getByTestId("tab-delegate").click();
    await page.getByTestId("delegate-amount-input").fill("999999");
    await expect(page.getByText(/Amount exceeds balance:/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  test("P1-6.4 missing operator blocks submit", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);
    await ensureHasClaimableBalance(page);

    await page.getByTestId("tab-delegate").click();
    await page.getByTestId("delegate-max-button").click();
    await page.getByRole("button", { name: "Continue" }).click();
    // Current UI gates review behind operator selection (operator modal opens).
    await expect(page.getByTestId("operator-search-input")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("operator-cancel-button").click();
    await expect(page.getByTestId("operator-search-input")).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("P1-6.1 delegate signing/state changes (expected failure until assertions implemented)", async ({
    page,
  }) => {
    test.fail(true, "TODO: assert on-chain state changes for delegate (§2.3)");
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);

    await page.getByTestId("tab-delegate").click();
    await page.getByTestId("delegate-amount-input").fill("0.01");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByTestId(`operator-row-${OPERATOR_1_ADDRESS}`).click();
    // Placeholder: keep as expected-failure until state assertions are implemented.
    expect(1, "placeholder failure until state-change assertions are added").toBe(2);
  });
});

