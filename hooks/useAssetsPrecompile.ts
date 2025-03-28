import { useChainId, useWalletClient } from 'wagmi'
import { getContract } from 'viem'
import IAssetsABI from '@/abi/IAssets.abi.json'
import { imua, publicClients } from '@/config/wagmi'
import { StakerBalance } from './useStakingPosition'
import { encodePacked } from 'viem'

// Address of the IAssets precompile contract
export const ASSETS_PRECOMPILE_ADDRESS = '0x0000000000000000000000000000000000000804'

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
  const getStakerBalanceByToken = async (
    endpointId: number,
    userAddress: `0x${string}`,
    tokenAddress: `0x${string}`
  ): Promise<{ success: boolean, stakerBalance?: StakerBalance }> => {
    if (!contract) return { success: false }
    
    try {
      // Use the contract instance to call the method
      const result = await contract.read.getStakerBalanceByToken([
        endpointId,
        encodePacked(['address'], [userAddress]),
        encodePacked(['address'], [tokenAddress])
      ]) as [boolean, StakerBalance]
      
      return { 
        success: result[0],
        stakerBalance: result[1]
      }
    } catch (error) {
      console.error(`Failed to read staker balance for ${tokenAddress} at endpoint ${endpointId}:`, error)
      return { success: false }
    }
  }

  return {
    contract,
    getStakerBalanceByToken
  }
}

