/**
 * Configuration constants for XRP integration
 */

// Constants
export const XRP_TOKEN_ENUM = 2;

export const MINIMUM_STAKE_AMOUNT_DROPS =
  process.env.NEXT_PUBLIC_MINIMUM_STAKE_AMOUNT_DROPS || "50000000";

// XRP Vault Configuration
export const XRP_VAULT_ADDRESS =
  process.env.NEXT_PUBLIC_XRP_VAULT_ADDRESS || "";
export const XRP_STAKING_DESTINATION_TAG = 9999;
