import { createConfig, http } from "wagmi";
import { sepolia, mainnet } from "wagmi/chains";
import { createPublicClient, http as viem_http } from "viem";

const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "";

/**
 * In E2E (Playwright + Anvil fork), talk to Anvil directly. Otherwise we rely on
 * Alchemy URL + Playwright route interception — which breaks when the API key is
 * missing/invalid or when RPC calls don't match the intercepted host. That shows up
 * as generic "Approval failed" because eth_sendRawTransaction / receipts fail.
 */
const isE2EClient =
  process.env.NEXT_PUBLIC_E2E_MODE === "true" ||
  process.env.NEXT_PUBLIC_E2E_MOCK_WALLETS === "true";

/** Same-origin proxy (see `app/api/e2e-anvil/route.ts`) — browser cannot call Anvil directly (no CORS). */
/** Use `localhost` (not 127.0.0.1) so origin matches Playwright `baseURL` and `/api/e2e-anvil` patch runs reliably. */
const HOODI_RPC_HTTP = isE2EClient
  ? "http://localhost:3000/api/e2e-anvil"
  : `https://eth-hoodi.g.alchemy.com/v2/${alchemyApiKey}`;

// Define Imua chain
// We use hardcoded values here for now because we are likely to be the sole API hoster.
// However, at some point, loading from dot env would be a good idea.
export const imua = {
  id: 233,
  name: "Imua",
  network: "imuachain",
  nativeCurrency: {
    decimals: 18,
    name: "Imua",
    symbol: "IM",
  },
  rpcUrls: {
    default: {
      http: ["https://api-eth.exocore-restaking.com"],
    },
    public: {
      http: ["https://api-eth.exocore-restaking.com"],
    },
  },
} as const;

export const imuaLocalnet = {
  id: 232,
  name: "Imua localnet",
  network: "imuachainlocalnet",
  nativeCurrency: {
    decimals: 18,
    name: "LocalImua",
    symbol: "lIMUA",
  },
  rpcUrls: {
    default: {
      http: ["http://localhost:8545"],
    },
    public: {
      http: ["http://localhost:8545"],
    },
  },
} as const;

export const hoodi = {
  id: 560048,
  name: "Hoodi",
  network: "hoodi",
  nativeCurrency: {
    decimals: 18,
    name: "HoodiETH",
    symbol: "hETH",
  },
  rpcUrls: {
    default: {
      http: [HOODI_RPC_HTTP],
    },
    public: {
      http: [HOODI_RPC_HTTP],
    },
  },
} as const;

export const ethPosLocalnet = {
  id: 31337,
  name: "ETH POS localnet",
  nativeCurrency: {
    decimals: 18,
    name: "LocalETH",
    symbol: "lETH",
  },
  rpcUrls: {
    default: {
      http: ["http://localhost:32003"],
    },
    public: {
      http: ["http://localhost:32003"],
    },
  },
};

// Create public clients for each chain
export const publicClients = {
  [sepolia.id]: createPublicClient({
    chain: sepolia,
    transport: viem_http(
      `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
    ),
  }),
  [hoodi.id]: createPublicClient({
    chain: hoodi,
    transport: viem_http(HOODI_RPC_HTTP),
  }),
  [mainnet.id]: createPublicClient({
    chain: mainnet,
    transport: viem_http(
      `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
    ),
  }),
  [imua.id]: createPublicClient({
    chain: imua,
    transport: viem_http("https://api-eth.exocore-restaking.com"),
  }),
  [ethPosLocalnet.id]: createPublicClient({
    chain: ethPosLocalnet,
    transport: viem_http("http://localhost:32003"),
  }),
  [imuaLocalnet.id]: createPublicClient({
    chain: imuaLocalnet,
    transport: viem_http("http://localhost:8545"),
  }),
};

// Create wagmi config with connectors
export const config = createConfig({
  chains: [sepolia, hoodi, mainnet, imua, ethPosLocalnet, imuaLocalnet],
  transports: {
    [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
    [hoodi.id]: http(HOODI_RPC_HTTP),
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
    // hardcoded because we are likely to be the sole API hoster.
    [imua.id]: http("https://api-eth.exocore-restaking.com"),
    [ethPosLocalnet.id]: http("http://localhost:32003"),
    [imuaLocalnet.id]: http("http://localhost:8545"),
  },
});

export type ValidEVMChain =
  | "Sepolia"
  | "Hoodi"
  | "Mainnet"
  | "Imua"
  | "ETH POS localnet"
  | "Imua localnet";
