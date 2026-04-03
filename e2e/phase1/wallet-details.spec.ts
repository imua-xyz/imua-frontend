/**
 * Phase 1 — Wallet details modal (P1-2.3).
 */
import { test, expect } from "@playwright/test";
import { setupTestHarness } from "../setup/test-harness";

test.describe("Phase 1: Wallet details", () => {
  test.beforeEach(async ({ page }) => {
    await setupTestHarness(page);
  });

  test("P1-2.3 header wallet details modal", async ({ page }) => {
    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });

    // Connect first (same pattern as other specs)
    await page.getByTestId("connect-wallet-cta").click();
    const connectInModal = page.locator("button").filter({ hasText: "Connect Wallet" }).last();
    await connectInModal.click();
    await expect(page.getByTestId("connect-wallet-cta")).not.toBeVisible({ timeout: 15000 });

    // Open dropdown, then click "View Details" to open modal.
    await page.getByTestId("wallet-status-button").click();
    await page.getByText("View Details").first().click();

    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({
      timeout: 10000,
    });
  });
});

