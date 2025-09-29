import { createConfig, http } from "wagmi";
import { sepolia, mainnet } from "wagmi/chains";
import { createPublicClient, http as viem_http } from "viem";
import { getDefaultWallets } from "@rainbow-me/rainbowkit";

// Get this from WalletConnect dashboard
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
if (!projectId) {
  throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set");
}
if (!alchemyApiKey) {
  throw new Error("NEXT_PUBLIC_ALCHEMY_API_KEY is not set");
}

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
    symbol: "IMUA",
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
      http: [
        `https://eth-hoodi.g.alchemy.com/v2/${alchemyApiKey}`,
      ],
    },
    public: {
      http: [
        `https://eth-hoodi.g.alchemy.com/v2/${alchemyApiKey}`,
      ],
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
}

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
    transport: viem_http(
      `https://eth-hoodi.g.alchemy.com/v2/${alchemyApiKey}`,
    ),
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

const { connectors } = getDefaultWallets({
  appName: "Imua Staking",
  projectId,
});

// Create wagmi config
export const config = createConfig({
  chains: [sepolia, hoodi, mainnet, imua, ethPosLocalnet, imuaLocalnet],
  transports: {
    [sepolia.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
    ),
    [hoodi.id]: http(
      `https://eth-hoodi.g.alchemy.com/v2/${alchemyApiKey}`,
    ),
    [mainnet.id]: http(
      `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
    ),
    // hardcoded because we are likely to be the sole API hoster.
    [imua.id]: http("https://api-eth.exocore-restaking.com"),
    [ethPosLocalnet.id]: http("http://localhost:32003"),
    [imuaLocalnet.id]: http("http://localhost:8545"),
  },
  connectors,
});

export type ValidEVMChain = "Sepolia" | "Hoodi" | "Mainnet" | "Imua" | "ETH POS localnet" | "Imua localnet";
