import { useAccount, useChainId, useWalletClient } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'
import { CHAIN_ID_TO_NAME, publicClients } from '@/config/wagmi'
import { getContract } from 'viem'

export function useClientChainGateway() {
  const { address: userAddress } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const publicClient = publicClients[chainId as keyof typeof publicClients]
  const contractAddress = chainId ? 
    CONTRACTS.CLIENT_CHAIN_GATEWAY.address[CHAIN_ID_TO_NAME[chainId as keyof typeof CHAIN_ID_TO_NAME]] : 
    undefined

  const contract = contractAddress && walletClient ? getContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi,
    client: {
      public: publicClient,
      wallet: walletClient
    }
  }) : null

  return {
    contract,
    publicClient,
    walletClient,
    contractAddress,
    userAddress
  }
}