/**
 * Phase 1 — Wallet Connection (P1-2.* from bootstrap EVM spec).
 * Requires dev server run with E2E env (e.g. .env.e2e) so mock EVM connector is used.
 */
import { test, expect } from "@playwright/test";
import { setupTestHarness } from "../setup/test-harness";

test.describe("Phase 1: Wallet Connection", () => {
  test.beforeEach(async ({ page }) => {
    await setupTestHarness(page);
  });

  test("P1-2.2 connect via staking CTA (mock EVM wallet)", async ({
    page,
  }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 60000,
    });
    await expect(page.getByTestId("connect-wallet-cta")).toBeVisible();

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
    await expect(
      page.getByTestId("wallet-status-button"),
    ).not.toContainText("Not Connected", { timeout: 5000 });
  });

  test("P1-2.6 connect wallet via header dropdown", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 60000,
    });

    await page.getByTestId("wallet-status-button").click();
    const headerConnectBtn = page.getByRole("button", {
      name: /Connect.*EVM.*Wallet/i,
    });
    await expect(headerConnectBtn).toBeVisible({ timeout: 5000 });
    await headerConnectBtn.click();

    await expect(
      page.getByTestId("wallet-status-button"),
    ).not.toContainText("Not Connected", { timeout: 15000 });
  });

  test("P1-2.4 disconnect wallet via header details", async ({ page }) => {
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

    await page.getByTestId("wallet-status-button").click();
    await page.getByText("View Details").first().click();
    await page.getByRole("button", { name: "Disconnect" }).click();

    await expect(
      page.getByTestId("wallet-status-button"),
    ).toContainText("Not Connected", { timeout: 10000 });
    await expect(page.getByTestId("connect-wallet-cta")).toBeVisible({
      timeout: 5000,
    });
  });

  test("P1-2.5 reconnect after disconnect", async ({ page }) => {
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

    await page.getByTestId("wallet-status-button").click();
    await page.getByText("View Details").first().click();
    await page.getByRole("button", { name: "Disconnect" }).click();
    await expect(
      page.getByTestId("wallet-status-button"),
    ).toContainText("Not Connected", { timeout: 10000 });

    await page.getByTestId("connect-wallet-cta").click();
    const connectAgain = page
      .locator("button")
      .filter({ hasText: "Connect Wallet" })
      .last();
    await expect(connectAgain).toBeVisible({ timeout: 5000 });
    await connectAgain.click();
    await expect(
      page.getByTestId("wallet-status-button"),
    ).not.toContainText("Not Connected", { timeout: 15000 });
  });
});
