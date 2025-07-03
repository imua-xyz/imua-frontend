import { Connector } from "wagmi";
import { Network, EVMNetwork, XRPL, sepolia, xrpl } from "./networks";
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
}

export type TokenType = "native" | "lst" | "nst";

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

export const exoETH: EVMLSTToken = {
  type: "lst",
  network: sepolia,
  name: "Imua Ethereum",
  symbol: "exoETH",
  address: "0x83E6850591425e3C1E263c054f4466838B9Bd9e4",
  decimals: 18,
  iconUrl: "/imua-logo.avif",
  underlyingAsset: "ETH",
  provider: "Imua",
  connector: evmConnector,
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
} as const;

export type Token = typeof exoETH | typeof wstETH | typeof xrp;

export const validTokens = [exoETH, wstETH, xrp];
