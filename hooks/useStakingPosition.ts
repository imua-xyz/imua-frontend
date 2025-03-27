import { useQuery } from '@tanstack/react-query'
import { COSMOS_CONFIG } from '@/config/cosmos'
import { imua } from '@/config/wagmi'
import { encodePacked } from 'viem'
import IAssetsABI from '@/abi/IAssets.abi.json'
import { createPublicClient, http } from 'viem'

interface AssetInfo {
  asset_id: string  // Format: "tokenAddress_lzEndpointId"
  info: {
    total_deposit_amount: string
    withdrawable_amount: string
    pending_undelegation_amount: string
  }
}

interface AssetMetadata {
  asset_basic_info: {
    name: string
    symbol: string
    address: string
    decimals: number
    layer_zero_chain_id: string
    imua_chain_index: string
    meta_info: string
  }
  staking_total_amount: string
}

export interface StakerBalance {
  clientChainID: number
  stakerAddress: `0x${string}`
  tokenID: `0x${string}`
  balance: bigint
  withdrawable: bigint
  delegated: bigint
  pendingUndelegated: bigint
  totalDeposited: bigint
}

export interface StakingPosition {
  assetId: string
  tokenAddress: `0x${string}`
  lzEndpointId: string
  totalBalance: bigint
  claimableBalance: bigint
  delegatedBalance: bigint
  pendingUndelegatedBalance: bigint
  metadata: {
    name: string
    symbol: string
    decimals: number
    lzEndpointId: string
    imuaChainIndex: string
    metaInfo: string
    totalStaked: bigint
  }
}

// Create a public client once for contract reads
const publicClient = createPublicClient({
  chain: imua,
  transport: http(),
})

// Address of the IAssets precompile contract
const ASSETS_PRECOMPILE_ADDRESS = '0x0000000000000000000000000000000000000804'

// Helper function to read staker balance data directly from the contract (no hooks)
async function readStakerBalance(
  endpointId: number,
  userAddress: `0x${string}`,
  tokenAddress: `0x${string}`
): Promise<{ success: boolean, stakerBalance?: StakerBalance }> {
  try {
    const result = await publicClient.readContract({
      address: ASSETS_PRECOMPILE_ADDRESS,
      abi: IAssetsABI,
      functionName: 'getStakerBalanceByToken',
      args: [
        endpointId,
        encodePacked(['address'], [userAddress]),
        encodePacked(['address'], [tokenAddress])
      ]
    }) as [boolean, StakerBalance]
        
    return { 
      success: result[0],
      stakerBalance: result[1]
    }
  } catch (error) {
    console.error(`Failed to read staker balance for ${tokenAddress} at endpoint ${endpointId}:`, error)
    return { success: false }
  }
}

export function useStakingPosition(userAddress: `0x${string}`, lzEndpointId: number) {
  // Convert decimal endpoint ID to hex for staker_id
  const stakerId = userAddress && lzEndpointId 
    ? `${userAddress.toLowerCase()}_0x${lzEndpointId.toString(16)}`
    : undefined

  return useQuery({
    queryKey: ['stakingPosition', stakerId],
    queryFn: async (): Promise<StakingPosition[]> => {
      if (!stakerId) {
        throw new Error('Invalid staker ID: Missing address or endpoint ID')
      }
      
      // Fetch asset infos
      const assetResponse = await fetch(
        `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.STAKER_ASSETS(stakerId)}`
      )
      const assetData = await assetResponse.json()
      const assetInfos: AssetInfo[] = assetData.asset_infos

      // Fetch positions with metadata
      const positions = await Promise.all(
        assetInfos.map(async (asset) => {
          // Parse token address and lz endpoint id from asset_id
          const [tokenAddress, hexLzEndpointId] = asset.asset_id.split('_') as [`0x${string}`, string]
          // Convert hex endpoint ID back to decimal
          const tokenLzEndpointId = parseInt(hexLzEndpointId, 16)

          // Fetch staker balance directly (no hooks)
          const { success, stakerBalance } = await readStakerBalance(
            tokenLzEndpointId,
            userAddress,
            tokenAddress
          )

          // Fetch asset metadata
          const metadataResponse = await fetch(
            `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.STAKING_ASSET_INFO(asset.asset_id)}`
          )
          const metadataData: AssetMetadata = await metadataResponse.json()

          return {
            assetId: asset.asset_id,
            tokenAddress,
            lzEndpointId: tokenLzEndpointId.toString(),
            totalBalance: BigInt(asset.info.total_deposit_amount),
            claimableBalance: BigInt(asset.info.withdrawable_amount),
            delegatedBalance: stakerBalance?.delegated || BigInt(0),
            pendingUndelegatedBalance: BigInt(asset.info.pending_undelegation_amount),
            metadata: {
              name: metadataData.asset_basic_info.name,
              symbol: metadataData.asset_basic_info.symbol,
              decimals: metadataData.asset_basic_info.decimals,
              lzEndpointId: metadataData.asset_basic_info.layer_zero_chain_id,
              imuaChainIndex: metadataData.asset_basic_info.imua_chain_index,
              metaInfo: metadataData.asset_basic_info.meta_info,
              totalStaked: BigInt(metadataData.staking_total_amount)
            }
          }
        })
      )

      return positions
    },
    refetchInterval: 30000,
    enabled: !!userAddress && !!lzEndpointId,
  })
} 