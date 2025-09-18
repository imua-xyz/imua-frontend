import { gql } from "@apollo/client";

// GraphQL queries for bootstrap phase data
export const GET_BOOTSTRAP_VALIDATORS = gql`
  query GetBootstrapValidators {
    bootstrap_validator {
      validator_eth_addr
      validator_im_addr
      validator_name
      consensus_pub_key
      commission_rate
      max_commission_rate
      max_change_rate
      updated_at
    }
  }
`;

export const GET_BOOTSTRAP_DELEGATIONS = gql`
  query GetBootstrapDelegations($stakerId: String!) {
    bootstrap_delegation_states(where: { staker_id: { _eq: $stakerId } }) {
      staker_id
      asset_id
      operator_addr
      delegated
      updated_at
    }
  }
`;

export const GET_BOOTSTRAP_DELEGATIONS_BY_ASSET = gql`
  query GetBootstrapDelegationsByAsset($stakerId: String!, $assetId: String!) {
    bootstrap_delegation_states(
      where: { staker_id: { _eq: $stakerId }, asset_id: { _eq: $assetId } }
    ) {
      staker_id
      asset_id
      operator_addr
      delegated
      updated_at
    }
  }
`;

export const GET_BOOTSTRAP_STAKER_ASSETS = gql`
  query GetBootstrapStakerAssets($stakerId: String!) {
    bootstrap_staker_assets(where: { staker_id: { _eq: $stakerId } }) {
      staker_id
      asset_id
      deposited
      withdrawable
      delegated
      updated_at
    }
  }
`;

export const GET_BOOTSTRAP_TOKENS = gql`
  query GetBootstrapTokens {
    bootstrap_tokens {
      asset_id
      name
      symbol
      address
      decimals
      layer_zero_chain_id
      staking_total_amount
      total_usd_value
      updated_at
    }
  }
`;

export const GET_BOOTSTRAP_TOKEN_PRICES = gql`
  query GetBootstrapTokenPrices {
    bootstrap_token_prices {
      asset_id
      price
      updated_at
    }
  }
`;

export const GET_BOOTSTRAP_TOKEN_PRICE = gql`
  query GetBootstrapTokenPrice($assetId: String!) {
    bootstrap_token_prices(where: { asset_id: { _eq: $assetId } }) {
      asset_id
      price
      updated_at
    }
  }
`;

// Subscriptions for real-time updates
export const BOOTSTRAP_DELEGATION_UPDATED = gql`
  subscription BootstrapDelegationUpdated($stakerId: String!) {
    bootstrap_delegation_states(where: { staker_id: { _eq: $stakerId } }) {
      staker_id
      asset_id
      operator_addr
      delegated
      updated_at
    }
  }
`;

export const BOOTSTRAP_VALIDATOR_UPDATED = gql`
  subscription BootstrapValidatorUpdated {
    bootstrap_validator {
      validator_eth_addr
      validator_im_addr
      validator_name
      commission_rate
      max_commission_rate
      max_change_rate
      updated_at
    }
  }
`;

// Address binding queries for bootstrap phase
export const GET_BOOTSTRAP_ADDRESS_BINDING = gql`
  query GetBootstrapAddressBinding($chainType: String!, $sourceAddr: String!) {
    bootstrap_address_bindings(
      where: {
        chain_type: { _eq: $chainType }
        source_addr: { _eq: $sourceAddr }
      }
    ) {
      chain_type
      source_addr
      target_addr
      created_at
      updated_at
    }
  }
`;

export const GET_BOOTSTRAP_ADDRESS_BINDINGS_BY_TARGET = gql`
  query GetBootstrapAddressBindingsByTarget(
    $chainType: String!
    $targetAddr: String!
  ) {
    bootstrap_address_bindings(
      where: {
        chain_type: { _eq: $chainType }
        target_addr: { _eq: $targetAddr }
      }
    ) {
      chain_type
      source_addr
      target_addr
      created_at
      updated_at
    }
  }
`;

// Subscription for address binding updates
export const BOOTSTRAP_ADDRESS_BINDING_UPDATED = gql`
  subscription BootstrapAddressBindingUpdated(
    $chainType: String!
    $sourceAddr: String!
  ) {
    bootstrap_address_bindings(
      where: {
        chain_type: { _eq: $chainType }
        source_addr: { _eq: $sourceAddr }
      }
    ) {
      chain_type
      source_addr
      target_addr
      created_at
      updated_at
    }
  }
`;

// Network statistics queries
export const GET_TOTAL_TVL = gql`
  query GetTotalTvl {
    get_total_tvl {
      total
    }
  }
`;

export const GET_ACTIVE_STAKER_COUNT = gql`
  query GetActiveStakerCount {
    get_active_staker_count {
      count
    }
  }
`;

export const GET_BOOTSTRAP_STATISTICS = gql`
  query GetBootstrapStatistics {
    bootstrap_statistics {
      tvl
      updated_at
    }
  }
`;

export const GET_NETWORK_STATISTICS = gql`
  query GetNetworkStatistics {
    get_total_tvl {
      total
    }
    get_active_staker_count {
      count
    }
    bootstrap_tokens {
      asset_id
      name
      symbol
      staking_total_amount
      total_usd_value
      decimals
    }
  }
`;

export const GET_BOOTSTRAP_OPERATOR_ASSETS = gql`
  query GetBootstrapOperatorAssets($assetId: String!) {
    bootstrap_operator_assets(where: { asset_id: { _eq: $assetId } }) {
      operator_addr
      asset_id
      total_amount
      self_amount
      other_amount
      updated_at
    }
  }
`;
