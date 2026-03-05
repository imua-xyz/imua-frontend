import { testWithSynpress } from "@synthetixio/synpress";
import {
  ethereumWalletMockFixtures,
} from "@synthetixio/synpress/playwright";
import { setupTestHarness } from "../setup/test-harness";

const test = testWithSynpress(ethereumWalletMockFixtures);
const { expect } = test;

test.describe("Wallet connection via mock provider", () => {
  test("connects wallet through WalletConnectionModal flow", async ({
    page,
    ethereumWalletMock,
  }) => {
    await setupTestHarness(page);
    await page.goto("/staking");
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 30000,
    });

    // Step 0: Verify initial state — wallet not connected
    await expect(page.getByTestId("connect-wallet-cta")).toBeVisible();

    // Step 1: Click "Connect Wallet" CTA in staking card
    await page.getByTestId("connect-wallet-cta").click();
    await page.waitForTimeout(1000);

    // Step 2: WalletConnectionModal opens — look for inner connect button
    // The modal heading is "Connect {chain} Wallet"
    const modalHeading = page.getByText(/Connect.*Wallet/i);
    const innerConnect = page.locator("button").filter({ hasText: "Connect Wallet" }).last();
    if (await innerConnect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await innerConnect.click();
      await page.waitForTimeout(500);
    }

    // Step 3: RainbowKit modal should appear with wallet options
    const mmOption = page.getByText("MetaMask");
    if (await mmOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mmOption.click();
    }

    // Step 4: Wait for connection — the CTA should disappear
    await expect(page.getByTestId("connect-wallet-cta")).not.toBeVisible({
      timeout: 15000,
    });
  });

  test("connects via header wallet status button", async ({
    page,
    ethereumWalletMock,
  }) => {
    await setupTestHarness(page);
    await page.goto("/staking");
    await expect(page.getByTestId("staking-heading")).toBeVisible({
      timeout: 30000,
    });

    // Click wallet status button in header
    await page.getByTestId("wallet-status-button").click();

    // Should show dropdown with "Not Connected" and connect option
    const connectOption = page.getByText(/Connect.*Wallet/i).last();
    await expect(connectOption).toBeVisible({ timeout: 5000 });
    await connectOption.click();

    // RainbowKit should appear
    const mmOption = page.getByText("MetaMask");
    if (await mmOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mmOption.click();
    }

    // Wait for connection
    await expect(page.getByText("Not Connected")).not.toBeVisible({
      timeout: 15000,
    });
  });
});
