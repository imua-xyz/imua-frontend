import {
  Network,
  EVMNetwork,
  xrpl,
  imuaChain,
  hoodi,
  bitcoin,
  bitcoinTestnet,
  BitcoinNetwork,
  BitcoinTestnetNetwork,
} from "./networks";
import { imuaDenom } from "./rewards";

// Define a base TokenBase interface with common properties
interface TokenBase {
  name: string;
  symbol: string;
  address: `0x${string}`;
  decimals: number;
  iconUrl: string;
  network: Network;
  type: TokenType;
  priceIndex: number;
}

export type TokenType = "native" | "lst" | "nst" | "reward";

// Define specific token type interfaces that extend the base
export interface NativeToken extends TokenBase {
  type: "native";
}

export interface LSTToken extends TokenBase {
  type: "lst";
  underlyingAsset: string;
  provider: string;
}

export interface NSTToken extends TokenBase {
  type: "nst";
  underlyingAsset: string;
}

export interface EVMLSTToken extends LSTToken {
  network: EVMNetwork;
}

export interface EVMNativeToken extends NativeToken {
  type: "native";
  network: EVMNetwork;
}

export const exoETH: EVMLSTToken = {
  type: "lst",
  network: hoodi,
  name: "Imua Ethereum",
  symbol: "imETH",
  address: "0x80E5bb3A04554E54b40Dd6e14ca0F97212d9428d",
  decimals: 18,
  iconUrl: "/imua-logo.avif",
  underlyingAsset: "ETH",
  provider: "Imua",
  priceIndex: 1,
} as const;

export const wstETH: EVMLSTToken = {
  type: "lst",
  network: hoodi,
  name: "Wrapped Staked Ether",
  symbol: "wstETH",
  address: "0x32118ebD4b82A84B0f13218dbA41f352CC7c2923",
  decimals: 18,
  iconUrl: "/wsteth-logo.svg",
  underlyingAsset: "ETH",
  provider: "Lido",
  priceIndex: 2,
} as const;

export const xrp: NativeToken = {
  type: "native",
  network: xrpl,
  name: "XRP",
  symbol: "XRP",
  address: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
  decimals: 6,
  iconUrl: "/xrp-logo.svg",
  priceIndex: 7,
} as const;

export const btc: NativeToken = {
  type: "native",
  network: bitcoin,
  name: "Bitcoin",
  symbol: "BTC",
  address: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
  decimals: 8,
  iconUrl: "/bitcoin-logo.svg",
  priceIndex: 6,
} as const;

export const tbtc: NativeToken = {
  type: "native",
  network: bitcoinTestnet,
  name: "Bitcoin Testnet",
  symbol: "tBTC",
  address: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
  decimals: 8,
  iconUrl: "/bitcoin-logo.svg",
  priceIndex: 6,
} as const;

export const imua: EVMNativeToken = {
  type: "native",
  name: "Imua",
  symbol: "IM",
  address: "0x0000000000000000000000000000000000000000",
  decimals: 18,
  iconUrl: "/imua-logo.avif",
  network: imuaChain,
  priceIndex: 1, // TODO: we use ETH's price index because the imua token does not have a price yet
} as const;

export type Token = typeof exoETH | typeof wstETH | typeof xrp | typeof tbtc;

export const validTokens: Token[] = [exoETH, wstETH, xrp, tbtc];

export const validRewardTokens: Token[] = [imua];

// Helper function for consistent token key generation
export function getTokenKey(token: Token): string {
  return `${token.network.customChainIdByImua}_${token.address.toLowerCase()}`;
}

// Helper function for reverse lookup
export function getTokenByKey(key: string): Token | undefined {
  const [customChainId, tokenAddress] = key.split("_");
  const tokens = new Set<Token>([...validTokens, ...validRewardTokens]);
  const token = Array.from(tokens).find(
    (t) =>
      t.address.toLowerCase() === tokenAddress.toLowerCase() &&
      t.network.customChainIdByImua === parseInt(customChainId),
  );
  if (!token) {
    return undefined;
  }
  return token;
}

export function getTokenBySymbol(symbol: string): Token | undefined {
  if (symbol === imuaDenom) {
    return imua;
  }
  const tokens = new Set<Token>([...validTokens, ...validRewardTokens]);
  const matchingTokens = Array.from(tokens).filter(
    (t) => t.symbol.toLowerCase() === symbol.toLowerCase(),
  );
  if (matchingTokens.length === 0) {
    return undefined;
  }
  if (matchingTokens.length > 1) {
    throw new Error(`Multiple tokens found for symbol: ${symbol}`);
  }
  return matchingTokens[0];
}

// Helper function to get network by custom chain ID from valid tokens
export const getNetworkByChainId = (customChainId: number) => {
  return validTokens.find(
    (token) => token.network.customChainIdByImua === customChainId,
  )?.network;
};
