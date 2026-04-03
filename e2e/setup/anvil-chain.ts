/**
 * Anvil RPC + chain metadata when using `anvil --fork-url <Hoodi RPC>`.
 * The fork keeps Hoodi's chain id (not 31337).
 */
export const ANVIL_RPC_URL = "http://localhost:8545";

/** `eth_chainId` from a Hoodi fork (decimal). */
export const ANVIL_HOODI_FORK_CHAIN_ID = 560048;
