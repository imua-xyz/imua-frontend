import { mock } from "@wagmi/core";
import { privateKeyToAccount } from "viem/accounts";
import { createE2ESigningConnectorInstance } from "./e2eSigningConnector";

// E2E mode is enabled when running Playwright-based tests against Anvil.
// This flag is wired via `.env.e2e` in local/dev test runs.
export const isE2EMode =
  process.env.NEXT_PUBLIC_E2E_MODE === "true" ||
  process.env.NEXT_PUBLIC_E2E_MOCK_WALLETS === "true";

// Anvil default account #0 private key (public test key, not a secret).
// This matches the account funded in `e2e/setup/anvil.ts`.
const TEST_EVM_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export function createTestWalletConnector() {
  const account = privateKeyToAccount(TEST_EVM_PRIVATE_KEY as `0x${string}`);

  // E2E: use signing-capable connector so stake/delegate/undelegate/claim/withdraw can submit real txs to Anvil.
  if (isE2EMode) {
    return createE2ESigningConnectorInstance();
  }

  return mock({
    accounts: [account.address],
  });
}

