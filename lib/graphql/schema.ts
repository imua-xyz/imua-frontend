// GraphQL schema definitions based on bootstrap.sql tables
export const BOOTSTRAP_SCHEMA = `
  type BootstrapValidator {
    validatorEthAddr: String!
    validatorImAddr: String!
    validatorName: String!
    consensusPubKey: String!
    commissionRate: Float!
    maxCommissionRate: Float!
    maxChangeRate: Float!
    updatedAt: String
  }

  type BootstrapToken {
    assetId: String!
    name: String!
    symbol: String!
    address: String!
    decimals: Int!
    layerZeroChainId: BigInt!
    stakingTotalAmount: Float!
    updatedAt: String
  }

  type BootstrapStakerAsset {
    stakerId: String!
    assetId: String!
    deposited: Float!
    withdrawable: Float!
    delegated: Float!
    updatedAt: String
  }

  type BootstrapDelegationState {
    stakerId: String!
    assetId: String!
    operatorAddr: String!
    delegated: Float!
    updatedAt: String
    # Related data
    validator: BootstrapValidator
    token: BootstrapToken
  }

  type BootstrapOperatorAsset {
    operatorAddr: String!
    assetId: String!
    totalAmount: Float!
    selfAmount: Float!
    otherAmount: Float!
    updatedAt: String
    # Related data
    validator: BootstrapValidator
    token: BootstrapToken
  }

  type Query {
    # Validators/Operators
    bootstrapValidators: [BootstrapValidator!]!
    bootstrapValidator(validatorImAddr: String!): BootstrapValidator
    
    # Tokens
    bootstrapTokens: [BootstrapToken!]!
    bootstrapToken(assetId: String!): BootstrapToken
    
    # Staker data
    bootstrapStakerAssets(stakerId: String!): [BootstrapStakerAsset!]!
    bootstrapStakerAsset(stakerId: String!, assetId: String!): BootstrapStakerAsset
    
    # Delegations
    bootstrapDelegations(stakerId: String!): [BootstrapDelegationState!]!
    bootstrapDelegationsByAsset(stakerId: String!, assetId: String!): [BootstrapDelegationState!]!
    bootstrapDelegation(stakerId: String!, assetId: String!, operatorAddr: String!): BootstrapDelegationState
    
    # Operator assets
    bootstrapOperatorAssets(operatorAddr: String!): [BootstrapOperatorAsset!]!
    bootstrapOperatorAsset(operatorAddr: String!, assetId: String!): BootstrapOperatorAsset
  }
`;

// TypeScript types matching the actual Hasura GraphQL schema
export interface BootstrapValidator {
  validator_eth_addr: string;
  validator_im_addr: string;
  validator_name: string;
  consensus_pub_key: string;
  commission_rate: number;
  max_commission_rate: number;
  max_change_rate: number;
  updated_at?: string;
}

export interface BootstrapToken {
  asset_id: string;
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  layer_zero_chain_id: string; // BigInt as string
  staking_total_amount: number;
  total_usd_value: number;
  updated_at?: string;
}

export interface BootstrapStakerAsset {
  staker_id: string;
  asset_id: string;
  deposited: number;
  withdrawable: number;
  delegated: number;
  updated_at?: string;
}

export interface BootstrapDelegationState {
  staker_id: string;
  asset_id: string;
  operator_addr: string;
  delegated: number;
  updated_at?: string;
}

export interface BootstrapOperatorAsset {
  operator_addr: string;
  asset_id: string;
  total_amount: number;
  self_amount: number;
  other_amount: number;
  updated_at?: string;
  validator?: BootstrapValidator;
  token?: BootstrapToken;
}

export interface BootstrapAddressBinding {
  chain_type: string;
  source_addr: string;
  target_addr: string;
  created_at: string;
  updated_at: string;
}

export interface BootstrapTokenPrice {
  asset_id: string;
  price: number;
  updated_at?: string;
}

export interface BootstrapStatistics {
  tvl: number;
  updated_at?: string;
}

export interface TotalTvlResult {
  total: number;
}

export interface ActiveStakerCountResult {
  count: number;
}
