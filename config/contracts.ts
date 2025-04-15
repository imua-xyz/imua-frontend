import ClientChainGatewayABI from '@/abi/ClientChainGateway.abi.json'
import UTXOGatewayABI from '@/abi/UTXOGateway.abi.json'
import deployedContracts from '@/deployedContracts.json'

export const CONTRACTS = {
  CLIENT_CHAIN_GATEWAY: {
    address: {
      sepolia: deployedContracts.clientChain.bootstrap, // Bootstrap and ClientChainGateway share same address
      mainnet: "" // Add mainnet address when available
    },
    abi: ClientChainGatewayABI
  },
  UTXOGateway: {
    address: {
      imuachain_testnet: deployedContracts.imuachain.utxoGateway
    },
    abi: UTXOGatewayABI
  }
} as const 
