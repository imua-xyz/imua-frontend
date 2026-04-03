/**
 * Playwright global teardown: stop Anvil if we started it in globalSetup (PID file present).
 */
import { stopAnvilDetached } from "./setup/anvil";

export default async function globalTeardown() {
  stopAnvilDetached();
}
