// The Bitcoin vault address
export const BTC_VAULT_ADDRESS =
  process.env.NEXT_PUBLIC_BTC_VAULT_ADDRESS || "";

// The Bitcoin Esplora API URL
export const ESPLORA_API_URL = process.env.NEXT_PUBLIC_ESPLORA_API_URL || "";

// The minimum stake amount in satoshis
export const MINIMUM_STAKE_AMOUNT_SATS = parseInt(
  process.env.NEXT_PUBLIC_MINIMUM_STAKE_AMOUNT_SATS || "5000",
);

// The dust threshold in satoshis
export const DUST_THRESHOLD = 546;

// The maximum number of outputs in a stake/deposit transaction
export const STAKE_TX_OUTPUT_MAX_COUNT = 3;

// The Bitcoin token enum representation in utxogateway
export const BTC_TOKEN_ENUM = 1;

// The Bitcoin confirmation threshold
export const BITCOIN_CONFIRMATION_THRESHOLD = parseInt(
  process.env.NEXT_PUBLIC_BITCOIN_CONFIRMATION_THRESHOLD || "6",
);
