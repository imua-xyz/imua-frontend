import { createConfig, http } from "wagmi";
import { sepolia, mainnet } from "wagmi/chains";
import { createPublicClient, http as viem_http } from "viem";
import { walletConnect } from "wagmi/connectors";

const projectId = "f6e3c67c095bd29425c6c94ff24b08db"; // Get this from WalletConnect dashboard

// Define Imua chain
export const imua = {
  id: 233, // Replace with actual chain ID
  name: "Imua",
  network: "imuachain",
  nativeCurrency: {
    decimals: 18,
    name: "Imua",
    symbol: "Imua",
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

// Create public clients for each chain
export const publicClients = {
  [sepolia.id]: createPublicClient({
    chain: sepolia,
    transport: viem_http(
      "https://eth-sepolia.g.alchemy.com/v2/f-RpeFxinYzcHV0IydB8u84Wkv74b8kI",
    ),
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

// Create wagmi config
export const config = createConfig({
  chains: [sepolia, mainnet, imua],
  transports: {
    [sepolia.id]: http(
      "https://eth-sepolia.g.alchemy.com/v2/f-RpeFxinYzcHV0IydB8u84Wkv74b8kI",
    ),
    [mainnet.id]: http(
      "https://eth-mainnet.g.alchemy.com/v2/f-RpeFxinYzcHV0IydB8u84Wkv74b8kI",
    ),
    [imua.id]: http("https://api-eth.exocore-restaking.com"),
  },
  connectors: [
    walletConnect({
      projectId,
      showQrModal: true,
      metadata: {
        name: "Imua",
        description: "Imua Staking",
        url: "https://imua.xyz",
        icons: ["https://avatars.githubusercontent.com/u/37784886"],
      },
    }),
  ],
});
