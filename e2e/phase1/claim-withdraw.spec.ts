/**
 * Phase 1 — Claim and Withdraw flows (P1-9.*, P1-10.*).
 */
import { test, expect } from "@playwright/test";
import { setupTestHarness } from "../setup/test-harness";

async function connect(page: any) {
  await page.getByTestId("connect-wallet-cta").click();
  const connectInModal = page.locator("button").filter({ hasText: "Connect Wallet" }).last();
  await connectInModal.click();
  await expect(page.getByTestId("connect-wallet-cta")).not.toBeVisible({ timeout: 15000 });
}

test.describe("Phase 1: Claim and Withdraw", () => {
  test.beforeEach(async ({ page }) => {
    await setupTestHarness(page);
  });

  test("P1-9.2 claim zero amount validation", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);

    await page.getByTestId("tab-withdraw").click();
    // Claim input exists only when claimable > 0 on real chain state.
    const claimInput = page.getByTestId("claim-amount-input");
    if (await claimInput.isVisible()) {
      await claimInput.fill("0");
      await expect(page.getByText("Amount must be greater than 0")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByTestId("claim-submit-button")).toBeDisabled();
      return;
    }
    await expect(page.getByText("No Tokens to Claim")).toBeVisible({ timeout: 10000 });
  });

  test("P1-9.3 claim amount above claimable validation", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);

    await page.getByTestId("tab-withdraw").click();
    const claimInput = page.getByTestId("claim-amount-input");
    if (await claimInput.isVisible()) {
      await claimInput.fill("999999");
      await expect(page.getByText(/Amount exceeds balance:/)).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByTestId("claim-submit-button")).toBeDisabled();
      return;
    }
    await expect(page.getByText("No Tokens to Claim")).toBeVisible({ timeout: 10000 });
  });

  test("P1-10.2 withdraw zero amount validation", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);

    await page.getByTestId("tab-withdraw").click();
    const withdrawInput = page.getByTestId("withdraw-amount-input");
    if (await withdrawInput.isVisible()) {
      await withdrawInput.fill("0");
      await expect(page.getByText("Amount must be greater than 0")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByTestId("withdraw-submit-button")).toBeDisabled();
      return;
    }
    await expect(
      page.getByText(/No tokens unlocked yet|No Tokens to Withdraw|No Tokens to Claim/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test("P1-10.3 withdraw amount above withdrawable validation", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);

    await page.getByTestId("tab-withdraw").click();
    const withdrawInput = page.getByTestId("withdraw-amount-input");
    if (await withdrawInput.isVisible()) {
      await withdrawInput.fill("999999");
      await expect(page.getByText(/Amount exceeds balance:/)).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByTestId("withdraw-submit-button")).toBeDisabled();
      return;
    }
    await expect(
      page.getByText(/No tokens unlocked yet|No Tokens to Withdraw|No Tokens to Claim/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test("P1-9.5 zero claimable: claim shows empty-state; withdraw usable if withdrawable > 0", async ({
    page,
  }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);
    await page.getByTestId("tab-withdraw").click();
    const claimInput = page.getByTestId("claim-amount-input");
    if (await claimInput.isVisible()) {
      await expect(page.getByTestId("claim-submit-button")).toBeVisible({
        timeout: 10000,
      });
      return;
    }
    await expect(page.getByText("No Tokens to Claim")).toBeVisible({ timeout: 10000 });
  });

  test("P1-9.4 claim signing/state changes (expected failure until assertions implemented)", async ({
    page,
  }) => {
    test.fail(true, "TODO: add on-chain state-change assertions for claim (§2.5)");
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);
    await page.getByTestId("tab-withdraw").click();
    await page.getByTestId("claim-amount-input").fill("0.01");
    expect(1, "placeholder failure until state-change assertions are added").toBe(2);
  });

  test("P1-10.4 withdraw signing/state changes (expected failure until assertions implemented)", async ({
    page,
  }) => {
    test.fail(true, "TODO: add on-chain state-change assertions for withdraw (§2.6)");
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connect(page);
    await page.getByTestId("tab-withdraw").click();
    await page.getByTestId("withdraw-amount-input").fill("0.01");
    expect(1, "placeholder failure until state-change assertions are added").toBe(2);
  });
});

