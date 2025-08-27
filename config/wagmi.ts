import { createConfig, http } from "wagmi";
import { sepolia, mainnet } from "wagmi/chains";
import { createPublicClient, http as viem_http } from "viem";
import { walletConnect } from "wagmi/connectors";
import { getDefaultWallets } from "@rainbow-me/rainbowkit";

const projectId = "f6e3c67c095bd29425c6c94ff24b08db"; // Get this from WalletConnect dashboard

// Define Imua chain
export const imua = {
  id: 233, // Replace with actual chain ID
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

export const hoodi = {
  id: 560048,
  name: "Hoodi",
  network: "hoodi",
  nativeCurrency: {
    decimals: 18,
    name: "Eth",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://ethereum-hoodi-rpc.publicnode.com"],
    },
    public: {
      http: ["https://ethereum-hoodi-rpc.publicnode.com"],
    },
  },
} as const;

// Create public clients for each chain
export const publicClients = {
  [sepolia.id]: createPublicClient({
    chain: sepolia,
    transport: viem_http(
      "https://eth-sepolia.g.alchemy.com/v2/f-RpeFxinYzcHV0IydB8u84Wkv74b8kI",
    ),
  }),
  [hoodi.id]: createPublicClient({
    chain: hoodi,
    transport: viem_http("https://ethereum-hoodi-rpc.publicnode.com"),
  }),
  [mainnet.id]: createPublicClient({
    chain: mainnet,
    transport: viem_http(
      "https://eth-mainnet.g.alchemy.com/v2/f-RpeFxinYzcHV0IydB8u84Wkv74b8kI",
    ),
  }),
  [imua.id]: createPublicClient({
    chain: imua,
    transport: viem_http("https://api-eth.exocore-restaking.com"),
  }),
};

const { connectors } = getDefaultWallets({
  appName: "Imua Staking",
  projectId,
});

// Create wagmi config
export const config = createConfig({
  chains: [sepolia, hoodi, mainnet, imua],
  transports: {
    [sepolia.id]: http(
      "https://eth-sepolia.g.alchemy.com/v2/f-RpeFxinYzcHV0IydB8u84Wkv74b8kI",
    ),
    [hoodi.id]: http("https://ethereum-hoodi-rpc.publicnode.com"),
    [mainnet.id]: http(
      "https://eth-mainnet.g.alchemy.com/v2/f-RpeFxinYzcHV0IydB8u84Wkv74b8kI",
    ),
    [imua.id]: http("https://api-eth.exocore-restaking.com"),
  },
  connectors,
});

export type ValidEVMChain = "Sepolia" | "Hoodi" | "Mainnet" | "Imua";
