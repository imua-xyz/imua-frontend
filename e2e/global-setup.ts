/**
 * Playwright global setup: ensure Anvil is running and fund the E2E test wallet.
 * - If ANVIL_FORK_URL is set: start Anvil in detached mode, then fund.
 * - Otherwise: assume Anvil is already running (e.g. `anvil --fork-url <url> --port 8545`), fund only.
 */
import {
  startAnvilDetached,
  stopAnvilDetached,
  waitForAnvil,
  fundTestWallet,
} from "./setup/anvil";

export default async function globalSetup() {
  stopAnvilDetached();

  const forkUrl = process.env.ANVIL_FORK_URL;
  if (forkUrl) {
    await startAnvilDetached(forkUrl);
  } else {
    await waitForAnvil();
  }
  await fundTestWallet();
}
