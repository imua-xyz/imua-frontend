import { useQuery } from '@tanstack/react-query'
import { COSMOS_CONFIG } from '@/config/cosmos'
import { useAssetsPrecompile } from './useAssetsPrecompile'

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

export function useStakingPosition(userAddress: `0x${string}`, lzEndpointId: number) {
  // Get the assets precompile contract and its methods
  const { getStakerBalanceByToken } = useAssetsPrecompile()
  
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

          // Fetch staker balance using the hook method
          const { success, stakerBalance } = await getStakerBalanceByToken(
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