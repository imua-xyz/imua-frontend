import { testWithSynpress } from "@synthetixio/synpress";
import {
  MetaMask,
  metaMaskFixtures,
} from "@synthetixio/synpress/playwright";
import basicSetup from "../wallet-setup/basic.setup";
import { setupGraphQLMocks } from "../setup/graphql-mocks";
import { setupRPCProxy } from "../setup/rpc-proxy";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

const ANVIL_RPC = "http://localhost:8545";
const HOODI_CHAIN_ID = 560048;

test.describe("Spike: Connect wallet and view staking page", () => {
  test.beforeEach(async ({ page }) => {
    // Route GraphQL requests to fixture data
    await setupGraphQLMocks(page);
    // Route EVM RPC calls to local Anvil fork
    await setupRPCProxy(page);
  });

  test("staking page loads and shows connect prompt", async ({ page }) => {
    await page.goto("/staking");

    // Verify the staking card renders
    await expect(page.getByText("Stake Assets")).toBeVisible({
      timeout: 15000,
    });

    // Verify imETH is the default token
    await expect(page.getByText("imETH")).toBeVisible();

    // Verify tabs are present (bootstrap: stake + delegate + undelegate)
    await expect(page.getByRole("button", { name: "Stake" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delegate" }),
    ).toBeVisible();

    // Verify connect prompt is shown (no wallet connected yet)
    await expect(page.getByText("Connect to Start Staking")).toBeVisible();
  });

  test("connects MetaMask and wallet status updates", async ({
    context,
    page,
    metamaskPage,
    extensionId,
  }) => {
    const metamask = new MetaMask(
      context,
      metamaskPage,
      basicSetup.walletPassword,
      extensionId,
    );

    // Add Anvil-forked Hoodi network to MetaMask
    await metamask.addNetwork({
      name: "Hoodi",
      rpcUrl: ANVIL_RPC,
      chainId: HOODI_CHAIN_ID,
      symbol: "ETH",
    });

    await page.goto("/staking");
    await expect(page.getByText("Stake Assets")).toBeVisible({
      timeout: 15000,
    });

    // Open the wallet connection flow via the header
    await page.getByText("Not Connected").click();

    // Wait for the dropdown to appear and click connect
    const connectBtn = page.getByText(/Connect.*EVM.*Wallet/i);
    if (await connectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectBtn.click();
    }

    // If RainbowKit modal appears, select MetaMask
    const mmOption = page.getByText("MetaMask");
    if (await mmOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mmOption.click();
    }

    // Approve the connection in MetaMask extension
    await metamask.connectToDapp();

    // Verify "Not Connected" is no longer visible (wallet is connected)
    await expect(page.getByText("Not Connected")).not.toBeVisible({
      timeout: 15000,
    });

    // The "Connect to Start Staking" prompt should be gone
    await expect(
      page.getByText("Connect to Start Staking"),
    ).not.toBeVisible({ timeout: 15000 });
  });
});
