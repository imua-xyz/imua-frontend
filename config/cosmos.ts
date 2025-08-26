export const COSMOS_CONFIG = {
  API_ENDPOINT: "https://api-cosmos-rest.exocore-restaking.com",
  PATHS: {
    ALL_OPERATORS: "/imuachain/operator/v1/all_operators",
    OPERATOR_INFO: (addr: string) =>
      `/imuachain/operator/v1/operator_info/${addr}`,
    STAKER_ASSETS: (stakerId: string) =>
      `/imuachain/assets/v1/staker_assets/${stakerId}`,
    DELEGATION_INFO: (stakerId: string, assetId: string) =>
      `/imuachain/delegation/v1/delegations/${stakerId}/${assetId}`,
    STAKING_ASSET_INFO: (assetId: string) =>
      `/imuachain/assets/v1/asset/${assetId}`,
    TOKEN_PRICE: (priceIndex: number) =>
      `/imuachain/oracle/v1/latest_price/${priceIndex}`,
    REWARDS: (stakerId: string) =>
      `/imuachain/feedistribution/v1/unclaimed_rewards//${stakerId}`,
    OPT_IN_AVS: (operatorAddress: string) =>
      `/imuachain/operator/v1/opt/avs_list/${operatorAddress}`,
  },
} as const;

export const INSTANT_UNBOND_SLASH_RATE =
  process.env.NEXT_PUBLIC_INSTANT_UNBOND_SLASH_RATE;

export const UNBOND_PERIOD = process.env.NEXT_PUBLIC_UNBOND_PERIOD;
