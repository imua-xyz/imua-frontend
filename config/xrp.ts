/**
 * Configuration constants for XRP integration
 */

// Constants
export const XRP_CHAIN_ID = 2;
export const XRP_TOKEN_ENUM = 2;
export const XRP_TOKEN_ADDRESS =
  "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB" as `0x${string}`;

// XRP Network Configuration
export const XRPL_MAINNET_WEBSOCKET = process.env.XRPL_MAINNET_WEBSOCKET || "";
export const XRPL_MAINNET_REST = process.env.XRPL_MAINNET_REST || "";
export const XRPL_TESTNET_WEBSOCKET = process.env.XRPL_TESTNET_WEBSOCKET || "";
export const XRPL_TESTNET_REST = process.env.XRPL_TESTNET_REST || "";

// XUMM App Configuration (would come from environment variables)
export const XUMM_API_KEY = process.env.XUMM_API_KEY || "";
export const XUMM_API_SECRET = process.env.XUMM_API_SECRET || "";

// XRP Vault Configuration
export const XRP_VAULT_ADDRESS = process.env.NEXT_PUBLIC_XRP_VAULT_ADDRESS || "";
export const XRP_STAKING_DESTINATION_TAG=9999

// UI Configuration
export const XRP_TESTNET_EXPLORER_URL =
  process.env.XRP_TESTNET_EXPLORER_URL || "";
export const XRP_MAINNET_EXPLORER_URL =
  process.env.XRP_MAINNET_EXPLORER_URL || "";

export const MIN_STAKE_AMOUNT = process.env.MIN_STAKE_AMOUNT || "";
export const DEFAULT_LEDGER_WAIT_TIME =
  process.env.DEFAULT_LEDGER_WAIT_TIME || "";
export const MAX_TRANSACTION_ATTEMPTS =
  process.env.MAX_TRANSACTION_ATTEMPTS || "";

// XRP Denomination Helpers
export const DROPS_PER_XRP = 1_000_000; // 1 XRP = 1,000,000 drops

// Convert XRP to drops (XRP's smallest unit)
export function xrpToDrops(xrp: string | number): string {
  const amount = typeof xrp === "string" ? parseFloat(xrp) : xrp;
  return Math.floor(amount * DROPS_PER_XRP).toString();
}

// Convert drops to XRP
export function dropsToXrp(drops: string | number): string {
  const amount = typeof drops === "string" ? parseInt(drops, 10) : drops;
  return (amount / DROPS_PER_XRP).toFixed(6);
}

// Base fee for XRP transactions in drops
export const BASE_FEE_DROPS = 12;

// XRP token decimals (6 for XRP)
export const XRP_DECIMALS = 6;

// XUMM API configuration
export const XUMM_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_XUMM_API_KEY || "",
  apiSecret: process.env.XUMM_API_SECRET || "",
  callbackUrl: process.env.NEXT_PUBLIC_XUMM_CALLBACK_URL || "",
};

// Explorer links
export const XRPL_EXPLORER = {
  transaction: (hash: string) =>
    `https://livenet.xrpl.org/transactions/${hash}`,
  account: (address: string) => `https://livenet.xrpl.org/accounts/${address}`,
};
