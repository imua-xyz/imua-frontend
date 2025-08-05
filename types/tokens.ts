import { Connector } from "wagmi";
import {
  Network,
  EVMNetwork,
  XRPL,
  sepolia,
  xrpl,
  imuaChain,
} from "./networks";
import { ConnectorBase, evmConnector, gemConnector } from "./connectors";

// Define a base TokenBase interface with common properties
interface TokenBase {
  name: string;
  symbol: string;
  address: `0x${string}`;
  decimals: number;
  iconUrl: string;
  network: Network;
  type: TokenType;
  connector: ConnectorBase;
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
  network: sepolia,
  name: "Imua Ethereum",
  symbol: "imETH",
  address: "0xF79F563571f7D8122611D0219A0d5449B5304F79",
  decimals: 18,
  iconUrl: "/imua-logo.avif",
  underlyingAsset: "ETH",
  provider: "Imua",
  connector: evmConnector,
  priceIndex: 1,
} as const;

export const wstETH: EVMLSTToken = {
  type: "lst",
  network: sepolia,
  name: "Wrapped Staked Ether",
  symbol: "wstETH",
  address: "0xB82381A3fBD3FaFA77B3a7bE693342618240067b",
  decimals: 18,
  iconUrl: "/wsteth-logo.svg",
  underlyingAsset: "ETH",
  provider: "Lido",
  connector: evmConnector,
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
  connector: gemConnector,
  priceIndex: 7,
} as const;

export const imua: EVMNativeToken = {
  type: "native",
  name: "Imua",
  symbol: "IM",
  address: "0x0000000000000000000000000000000000000000",
  decimals: 18,
  iconUrl: "/imua-logo.avif",
  network: imuaChain,
  connector: evmConnector,
  priceIndex: 1, // TODO: we use ETH's price index because the imua token does not have a price yet
} as const;

export type Token = typeof exoETH | typeof wstETH | typeof xrp;

export const validTokens: Token[] = [exoETH, wstETH, xrp];

export const validRewardTokens: Token[] = [imua];
