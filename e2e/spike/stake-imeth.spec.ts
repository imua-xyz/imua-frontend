import { testWithSynpress } from "@synthetixio/synpress";
import {
  MetaMask,
  metaMaskFixtures,
} from "@synthetixio/synpress/playwright";
import basicSetup from "../wallet-setup/basic.setup";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

// Anvil chain ID matches Hoodi (560048)
const ANVIL_RPC = "http://localhost:8545";
const HOODI_CHAIN_ID = 560048;

test.describe("Spike: imETH Staking", () => {
  test("should connect MetaMask and view staking page", async ({
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
      name: "Anvil Hoodi",
      rpcUrl: ANVIL_RPC,
      chainId: HOODI_CHAIN_ID,
      symbol: "ETH",
    });

    // Navigate to staking page
    await page.goto("/staking");
    await expect(page.locator("body")).toBeVisible();

    // Click connect wallet button
    await page.getByText("Not Connected").click();
    await page.getByText("Connect EVM Wallet").click();
    await page.getByText("MetaMask").click();

    // Approve connection in MetaMask
    await metamask.connectToDapp();

    // Verify wallet is connected — address should appear in header
    await expect(page.getByText("Not Connected")).not.toBeVisible({
      timeout: 10000,
    });

    // Verify staking page shows the Stake Assets card
    await expect(page.getByText("Stake Assets")).toBeVisible();

    // Verify imETH is the default selected token
    await expect(page.getByText("imETH")).toBeVisible();
  });
});
