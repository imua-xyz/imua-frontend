import ClientChainGatewayABI from '../ClientChainGateway.abi.json'
import deployedContracts from '../deployedContracts.json'

export const CONTRACTS = {
  CLIENT_CHAIN_GATEWAY: {
    address: {
      sepolia: deployedContracts.clientChain.bootstrap, // Bootstrap and ClientChainGateway share same address
      mainnet: "" // Add mainnet address when available
    },
    abi: ClientChainGatewayABI
  }
} as const 