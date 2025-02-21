export const COSMOS_CONFIG = {
  API_ENDPOINT: 'https://api-cosmos-rest.exocore-restaking.com',
  PATHS: {
    ALL_OPERATORS: '/exocore/operator/v1/all_operators',
    OPERATOR_INFO: (addr: string) => `/exocore/operator/v1/operator_info/${addr}`,
    STAKER_ASSETS: (stakerId: string) => `/exocore/assets/v1/QueStakerAssetInfos?staker_id=${stakerId}`,
    DELEGATION_INFO: (stakerId: string, assetId: string) => 
      `/exocore/delegation/v1/GetDelegationInfo?staker_id=${stakerId}&asset_id=${assetId}`,
    STAKING_ASSET_INFO: (assetId: string) => 
      `/exocore/assets/v1/QueStakingAssetInfo?asset_id=${assetId}`
  }
} as const 