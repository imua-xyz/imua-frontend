import { useMemo } from "react";
import { useQuery, useSubscription } from "@apollo/client/react";
import {
  GET_BOOTSTRAP_VALIDATORS,
  GET_BOOTSTRAP_DELEGATIONS,
  GET_BOOTSTRAP_DELEGATIONS_BY_ASSET,
  GET_BOOTSTRAP_ADDRESS_BINDING,
  GET_BOOTSTRAP_ADDRESS_BINDINGS_BY_TARGET,
  BOOTSTRAP_DELEGATION_UPDATED,
  BOOTSTRAP_VALIDATOR_UPDATED,
  BOOTSTRAP_ADDRESS_BINDING_UPDATED,
  GET_NETWORK_STATISTICS,
  GET_BOOTSTRAP_OPERATOR_ASSETS,
} from "@/lib/graphql/queries";
import {
  transformBootstrapValidatorToOperatorInfo,
  transformBootstrapDelegationsToDelegationsPerToken,
  filterDelegationsByAsset,
  generateStakerId,
  generateAssetId,
  sortOperatorsByCommissionRate,
} from "@/lib/graphql/transformers";
import { DelegationsPerToken } from "@/types/delegations";
import { Token } from "@/types/tokens";
import {
  BootstrapValidator,
  BootstrapDelegationState,
  BootstrapAddressBinding,
  BootstrapToken,
  BootstrapOperatorAsset,
  TotalTvlResult,
  ActiveStakerCountResult,
} from "@/lib/graphql/schema";

// GraphQL response types
interface GetBootstrapValidatorsResponse {
  bootstrap_validator: BootstrapValidator[];
}

interface GetBootstrapDelegationsByAssetResponse {
  bootstrap_delegation_states: BootstrapDelegationState[];
}

interface BootstrapDelegationUpdatedResponse {
  bootstrap_delegation_states: BootstrapDelegationState[];
}

interface BootstrapValidatorUpdatedResponse {
  bootstrap_validator: BootstrapValidator[];
}

interface GetBootstrapAddressBindingResponse {
  bootstrap_address_bindings: BootstrapAddressBinding[];
}

interface BootstrapAddressBindingUpdatedResponse {
  bootstrap_address_bindings: BootstrapAddressBinding[];
}

interface GetNetworkStatisticsResponse {
  get_total_tvl: TotalTvlResult[];
  get_active_staker_count: ActiveStakerCountResult[];
  bootstrap_tokens: BootstrapToken[];
}

interface GetBootstrapOperatorAssetsResponse {
  bootstrap_operator_assets: BootstrapOperatorAsset[];
}

/**
 * Hook to fetch bootstrap validators via GraphQL
 */
export function useBootstrapValidatorsGraphQL() {
  const { data, loading, error, refetch } =
    useQuery<GetBootstrapValidatorsResponse>(GET_BOOTSTRAP_VALIDATORS, {
      errorPolicy: "all",
      notifyOnNetworkStatusChange: true,
      pollInterval: 30000, // Poll every 30 seconds for operator updates
    });

  const operators = useMemo(() => {
    if (!data?.bootstrap_validator) return [];

    const transformedOperators = data.bootstrap_validator.map(
      transformBootstrapValidatorToOperatorInfo,
    );

    return sortOperatorsByCommissionRate(transformedOperators);
  }, [data?.bootstrap_validator]);

  return {
    data: operators,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch bootstrap delegations via GraphQL
 */
export function useBootstrapDelegationsGraphQL(
  stakerAddress: string,
  token: Token,
) {
  const stakerId = generateStakerId(
    stakerAddress,
    token.network.customChainIdByImua,
  );
  const assetId = generateAssetId(
    token.address,
    token.network.customChainIdByImua,
  );

  // Fetch operators to get operator names
  const { data: operatorsData } = useBootstrapValidatorsGraphQL();

  const { data, loading, error, refetch } =
    useQuery<GetBootstrapDelegationsByAssetResponse>(
      GET_BOOTSTRAP_DELEGATIONS_BY_ASSET,
      {
        variables: { stakerId, assetId },
        errorPolicy: "all",
        notifyOnNetworkStatusChange: true,
        skip: !stakerAddress || !token.address,
        pollInterval: 3000, // Poll every 3 seconds
      },
    );

  const delegations = useMemo(() => {
    if (!data?.bootstrap_delegation_states) {
      return {
        token,
        userAddress: stakerAddress as `0x${string}`,
        delegationsByOperator: new Map(),
      } as DelegationsPerToken;
    }

    return transformBootstrapDelegationsToDelegationsPerToken(
      data.bootstrap_delegation_states,
      token,
      stakerAddress,
      operatorsData || [],
    );
  }, [data?.bootstrap_delegation_states, token, stakerAddress, operatorsData]);

  return {
    data: delegations,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for real-time delegation updates
 */
export function useBootstrapDelegationUpdates(stakerAddress: string) {
  const stakerId = useMemo(
    () => (stakerAddress ? generateStakerId(stakerAddress, 1) : ""), // Default to chain ID 1
    [stakerAddress],
  );

  const { data, loading, error } =
    useSubscription<BootstrapDelegationUpdatedResponse>(
      BOOTSTRAP_DELEGATION_UPDATED,
      {
        variables: { stakerId },
        skip: !stakerId,
        onData: ({ data: subscriptionData }: { data: any }) => {
          console.log("Delegation updated:", subscriptionData);
          // The subscription data will automatically update the cache
        },
      },
    );

  return {
    data: data?.bootstrap_delegation_states,
    loading,
    error,
  };
}

/**
 * Hook for real-time validator updates
 */
export function useBootstrapValidatorUpdates() {
  const { data, loading, error } =
    useSubscription<BootstrapValidatorUpdatedResponse>(
      BOOTSTRAP_VALIDATOR_UPDATED,
      {
        onData: ({ data: subscriptionData }: { data: any }) => {
          console.log("Validator updated:", subscriptionData);
          // The subscription data will automatically update the cache
        },
      },
    );

  return {
    data: data?.bootstrap_validator,
    loading,
    error,
  };
}

/**
 * Hook to fetch address binding for a specific chain and source address
 */
export function useBootstrapAddressBinding(
  chainType: string,
  sourceAddr: string,
) {
  const { data, loading, error, refetch } =
    useQuery<GetBootstrapAddressBindingResponse>(
      GET_BOOTSTRAP_ADDRESS_BINDING,
      {
        variables: { chainType, sourceAddr },
        errorPolicy: "all",
        notifyOnNetworkStatusChange: true,
        skip: !chainType || !sourceAddr,
        pollInterval: 30000, // Poll every 30 seconds for address binding updates
      },
    );

  const binding = useMemo(() => {
    if (
      !data?.bootstrap_address_bindings ||
      data.bootstrap_address_bindings.length === 0
    ) {
      return null;
    }

    // Return the first (and should be only) binding
    return data.bootstrap_address_bindings[0];
  }, [data?.bootstrap_address_bindings]);

  return {
    data: binding,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch address binding by target address (reverse lookup)
 * Returns a single binding (unique per chain_type and target_addr)
 */
export function useBootstrapAddressBindingsByTarget(
  chainType: string,
  targetAddr: string,
) {
  const { data, loading, error, refetch } =
    useQuery<GetBootstrapAddressBindingResponse>(
      GET_BOOTSTRAP_ADDRESS_BINDINGS_BY_TARGET,
      {
        variables: { chainType, targetAddr },
        errorPolicy: "all",
        notifyOnNetworkStatusChange: true,
        skip: !chainType || !targetAddr,
        pollInterval: 30000, // Poll every 30 seconds for address binding updates
      },
    );

  const binding = useMemo(() => {
    if (
      !data?.bootstrap_address_bindings ||
      data.bootstrap_address_bindings.length === 0
    ) {
      return null;
    }

    // Return the first (and should be only) binding due to unique constraint
    return data.bootstrap_address_bindings[0];
  }, [data?.bootstrap_address_bindings]);

  return {
    data: binding,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for real-time address binding updates
 */
export function useBootstrapAddressBindingUpdates(
  chainType: string,
  sourceAddr: string,
) {
  const { data, loading, error } =
    useSubscription<BootstrapAddressBindingUpdatedResponse>(
      BOOTSTRAP_ADDRESS_BINDING_UPDATED,
      {
        variables: { chainType, sourceAddr },
        skip: !chainType || !sourceAddr,
        onData: ({ data: subscriptionData }: { data: any }) => {
          console.log("Address binding updated:", subscriptionData);
          // The subscription data will automatically update the cache
        },
      },
    );

  return {
    data: data?.bootstrap_address_bindings,
    loading,
    error,
  };
}

/**
 * Hook to fetch network statistics from GraphQL
 * Returns TVL, active staker count, and total tokens staked per asset
 */
export function useBootstrapNetworkStatistics() {
  const { data, loading, error, refetch } =
    useQuery<GetNetworkStatisticsResponse>(GET_NETWORK_STATISTICS, {
      errorPolicy: "all",
      notifyOnNetworkStatusChange: true,
      pollInterval: 30000, // Refetch every 30 seconds
    });

  const statistics = useMemo(() => {
    if (!data) {
      return {
        totalTvl: 0,
        activeStakers: 0,
        totalTokensStaked: {} as Record<string, number>,
      };
    }

    // Extract TVL
    const totalTvl = data.get_total_tvl?.[0]?.total ?? 0;

    // Extract active staker count
    const activeStakers = Number(data.get_active_staker_count?.[0]?.count ?? 0);

    // Build total tokens staked by symbol
    const totalTokensStaked: Record<string, number> = {};
    data.bootstrap_tokens?.forEach((token) => {
      totalTokensStaked[token.symbol] = token.staking_total_amount;
    });

    return {
      totalTvl,
      activeStakers,
      totalTokensStaked,
      tokens: data.bootstrap_tokens || [],
    };
  }, [data]);

  return {
    data: statistics,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch operator positions (assets) by asset ID
 * Returns mapping of operator addresses to their positions (total, self, other amounts)
 */
export function useBootstrapOperatorAssets(token: Token | null | undefined) {
  const assetId = useMemo(() => {
    if (!token) return "";
    return generateAssetId(token.address, token.network.customChainIdByImua);
  }, [token]);

  const { data, loading, error, refetch } =
    useQuery<GetBootstrapOperatorAssetsResponse>(
      GET_BOOTSTRAP_OPERATOR_ASSETS,
      {
        variables: { assetId },
        errorPolicy: "all",
        notifyOnNetworkStatusChange: true,
        skip: !token || !assetId,
        pollInterval: 30000, // Refetch every 30 seconds
      },
    );

  // Create a map of operator addresses to their positions
  const operatorPositions = useMemo(() => {
    if (!data?.bootstrap_operator_assets) {
      return new Map<string, BootstrapOperatorAsset>();
    }

    const positionsMap = new Map<string, BootstrapOperatorAsset>();
    data.bootstrap_operator_assets.forEach((position) => {
      positionsMap.set(position.operator_addr, position);
    });

    return positionsMap;
  }, [data?.bootstrap_operator_assets]);

  return {
    data: operatorPositions,
    loading,
    error,
    refetch,
  };
}
