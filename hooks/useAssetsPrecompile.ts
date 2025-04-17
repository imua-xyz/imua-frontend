import { useCallback } from 'react'
import { useChainId } from 'wagmi'
import { getContract } from 'viem'
import IAssetsABI from '@/abi/IAssets.abi.json'
import { imua, publicClients } from '@/config/wagmi'
import { encodePacked } from 'viem'

// Address of the IAssets precompile contract
export const ASSETS_PRECOMPILE_ADDRESS = '0x0000000000000000000000000000000000000804'
interface StakerBalanceResponse {
  clientChainID: number
  stakerAddress: `0x${string}`
  tokenID: `0x${string}`
  balance: bigint
  withdrawable: bigint
  delegated: bigint
  pendingUndelegated: bigint
  totalDeposited: bigint
}

export function useAssetsPrecompile() {
  const chainId = useChainId()
  
  // Get the public client for the current chain (or fallback to imua chain)
  // The Assets precompile is on the Imua chain, so we want to use that client
  const imuaPublicClient = publicClients[imua.id as keyof typeof publicClients]

  // Create contract instance
  const contract = getContract({
    address: ASSETS_PRECOMPILE_ADDRESS as `0x${string}`,
    abi: IAssetsABI,
    client: {
      public: imuaPublicClient
    }
  })

  // Helper method to get staker balance
  const getStakerBalanceByToken = useCallback(async (
    userAddress: `0x${string}`,
    endpointId?: number,
    tokenAddress?: `0x${string}`
  ): Promise<{ success: boolean, stakerBalanceResponse?: StakerBalanceResponse }> => {
    if (!contract || !tokenAddress || !userAddress || !endpointId) return { success: false }
    
    try {
      // Use the contract instance to call the method
      const result = await contract.read.getStakerBalanceByToken([
        endpointId,
        encodePacked(['address'], [userAddress]),
        encodePacked(['address'], [tokenAddress])
      ]) as [boolean, StakerBalanceResponse]
      
      return { 
        success: result[0],
        stakerBalanceResponse: result[1]
      }
    } catch (error) {
      console.error(`Failed to read staker balance for ${tokenAddress} at endpoint ${endpointId}:`, error)
      return { success: false }
    }
  }, [contract])

  return {
    contract,
    getStakerBalanceByToken
  }
}

