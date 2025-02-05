import { createConfig, http } from 'wagmi'
import { sepolia, mainnet } from 'wagmi/chains'
import { createPublicClient, http as viem_http } from 'viem'
import { walletConnect } from 'wagmi/connectors'

const projectId = 'f6e3c67c095bd29425c6c94ff24b08db' // Get this from WalletConnect dashboard

// Create public clients for each chain
export const publicClients = {
  [sepolia.id]: createPublicClient({
    chain: sepolia,
    transport: viem_http('https://eth-sepolia.g.alchemy.com/v2/f-RpeFxinYzcHV0IydB8u84Wkv74b8kI')
  }),
  [mainnet.id]: createPublicClient({
    chain: mainnet,
    transport: viem_http('https://eth-mainnet.g.alchemy.com/v2/f-RpeFxinYzcHV0IydB8u84Wkv74b8kI')
  })
}

// Chain ID to name mapping
export const CHAIN_ID_TO_NAME = {
  11155111: 'sepolia',
  1: 'mainnet'
} as const

// Chain ID to LayerZero endpoint ID mapping
export const CHAIN_ID_TO_ENDPOINT = {
  11155111: 40161, // Sepolia
  1: 30101,        // Mainnet
} as const

// Define Exocore chain
export const exocore = {
  id: 233, // Replace with actual chain ID
  name: 'Exocore',
  network: 'exocore',
  nativeCurrency: {
    decimals: 18,
    name: 'EXO',
    symbol: 'EXO',
  },
  rpcUrls: {
    default: {
      http: ['https://api-eth.exocore-restaking.com'], // Replace with actual RPC URL
    },
    public: {
      http: ['https://api-eth.exocore-restaking.com'], // Replace with actual RPC URL
    },
  },
} as const

// Create wagmi config
export const config = createConfig({
  chains: [sepolia, mainnet, exocore],
  transports: {
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/f-RpeFxinYzcHV0IydB8u84Wkv74b8kI'),
    [mainnet.id]: http('https://eth-mainnet.g.alchemy.com/v2/f-RpeFxinYzcHV0IydB8u84Wkv74b8kI'),
    [exocore.id]: http('https://api-eth.exocore-restaking.com'),
  },
  connectors: [
    walletConnect({
      projectId,
      showQrModal: true,
      metadata: {
        name: 'Exocore',
        description: 'Exocore Staking',
        url: 'https://exocore.io',
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      }
    })
  ]
}) 