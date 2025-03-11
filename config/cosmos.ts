export const COSMOS_CONFIG = {
  API_ENDPOINT: 'https://api-cosmos-rest.exocore-restaking.com',
  PATHS: {
    ALL_OPERATORS: '/imuachain/operator/v1/all_operators',
    OPERATOR_INFO: (addr: string) => `/imuachain/operator/v1/operator_info/${addr}`,
    STAKER_ASSETS: (stakerId: string) => `/imuachain/assets/v1/staker_assets/${stakerId}`,
    DELEGATION_INFO: (stakerId: string, assetId: string) => 
      `/imuachain/delegation/v1/delegations/${stakerId}/${assetId}`,
    STAKING_ASSET_INFO: (assetId: string) => 
      `/imuachain/assets/v1/asset/${assetId}`
  }
} as const 