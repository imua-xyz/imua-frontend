import type { Address } from "viem";
import { hoodi } from "../../types/networks";

/**
 * Portal contract used for on-chain reads/writes when Playwright runs against
 * Anvil with `--fork-url` pointing at Hoodi.
 *
 * Hoodi LST tokens (`exoETH`, `wstETH`) use `token.network === hoodi`, so the UI
 * submits deposits/delegates to this address. Do **not** use
 * `bootstrapContractNetwork.portalContract` here: when
 * `NEXT_PUBLIC_NST_LOCALNET=true`, that points at `ethPosLocalnet` (different
 * chain id + address), while E2E Anvil is still a Hoodi fork on :8545.
 * Helpers would then poll the wrong contract and time out waiting for
 * preconditions.
 */
export const anvilE2EPortalAddress = hoodi.portalContract.address as Address;
