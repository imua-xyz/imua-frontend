import { useCallback } from 'react'
import { useAccount, useChainId, useWalletClient } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'
import { CHAIN_ID_TO_NAME, publicClients } from '@/config/wagmi'
import { getContract } from 'viem'
import { OperationType } from '@/types/staking'
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

  const getQuote = useCallback(async (operation: OperationType) : Promise<bigint> => {
    if (!contract) return BigInt(0)

    const lengths = {
      'asset': 97,
      'delegation': 138,
      'associate': 74,
      'dissociate': 33
    }

    const message = '0x' + '00'.repeat(lengths[operation])
    const fee = await contract.read.quote([message])
    return fee as bigint
  }, [contract])

  return {
    contract,
    publicClient,
    walletClient,
    contractAddress,
    userAddress,
    getQuote
  }
}