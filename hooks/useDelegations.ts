import { useEffect, useRef } from "react";
import { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { COSMOS_CONFIG } from "@/config/cosmos";
import { Token } from "@/types/tokens";
import {
  DelegationsPerToken,
  DelegationsResponse,
  DelegationPerOperator,
} from "@/types/delegations";
import { getQueryStakerAddress } from "@/stores/allWalletsStore";
import { useOperators } from "./useOperators";
import { useBootstrapStatus } from "./useBootstrapStatus";
import {
  useOptimisticCacheStore,
  usePendingTransactionsForStakerAsset,
} from "@/stores/optimisticCacheStore";
import {
  generateStakerId,
  generateAssetId,
} from "@/lib/graphql/transformers";
import { mergeDelegations } from "@/lib/optimistic-merge";
import { transformBootstrapDelegationsToDelegationsPerToken } from "@/lib/graphql/transformers";
import { apolloClient } from "@/lib/graphql/client";
import { GET_BOOTSTRAP_DELEGATIONS_BY_ASSET } from "@/lib/graphql/queries";
import { BootstrapDelegationState } from "@/lib/graphql/schema";

// If no staker address, returns { data: undefined, isLoading: false, error: null, ... }
export function useDelegations(
  token: Token,
): UseQueryResult<DelegationsPerToken, Error> {
  const { data: operators } = useOperators();
  const { queryAddress, stakerAddress } = getQueryStakerAddress(token);
  const { bootstrapStatus } = useBootstrapStatus();

  const customChainId = token.network.customChainIdByImua;

  // Get optimistic cache store (for cleanup actions)
  const optimisticCache = useOptimisticCacheStore();

  // Generate IDs for optimistic cache lookup
  const stakerId = generateStakerId(queryAddress || "", customChainId);
  const assetId = generateAssetId(token.address, customChainId);

  // Use memoized selector for pending transactions to avoid re-renders
  const pendingTxs = usePendingTransactionsForStakerAsset(stakerId, assetId);

  // Stable key so query re-runs when pending txs change (merge happens inside queryFn).
  const pendingTxsKey = pendingTxs.length;

  // Store merged delegations (with updated_at_block) for cleanup effect
  const mergedDelegationsRef = useRef<BootstrapDelegationState[]>([]);

  // Always call useQuery, but control execution with enabled option
  const query = useQuery({
    queryKey: [
      "delegations",
      queryAddress,
      token.address,
      customChainId,
      bootstrapStatus?.isBootstrapped,
      pendingTxsKey, // Include pending tx count so query re-runs when optimistic updates are added
    ],
    queryFn: async (): Promise<DelegationsPerToken> => {
      if (!queryAddress) {
        throw new Error("No staker address available");
      }

      // Post-bootstrap: fetch from Imuachain (Cosmos API)
      if (bootstrapStatus?.isBootstrapped) {
        // Cosmos RPC: /imuachain/delegation/v1/delegations/{stakerId}/{assetId}
        const stakerId = `${queryAddress.toLowerCase()}_0x${customChainId.toString(16)}`;
        const assetId = `${token.address.toLowerCase()}_0x${customChainId.toString(16)}`;
        const url = `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.DELEGATION_INFO(stakerId, assetId)}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch delegations: ${response.status} ${response.statusText}`,
          );
        }
        const data = (await response.json()) as DelegationsResponse;
        const infos = data.delegation_infos || [];

        // Convert to Map for O(1) lookups by operator address
        const delegationsByOperator = new Map<string, DelegationPerOperator>();
        infos.forEach((item) => {
          delegationsByOperator.set(item.operator.toLowerCase(), {
            operatorAddress: item.operator,
            operatorName: operators?.find(
              (op) => op.address.toLowerCase() === item.operator.toLowerCase(),
            )?.operator_meta_info,
            delegated: BigInt(item.delegation_info.max_undelegatable_amount),
            unbonding: BigInt(
              item.delegation_info.delegation_amounts.wait_undelegation_amount,
            ),
          });
        });

        return {
          token,
          userAddress: stakerAddress!,
          delegationsByOperator,
        };
      }

      // Bootstrap phase: Fetch GraphQL, merge with optimistic cache, return DelegationsPerToken
      if (!bootstrapStatus?.isBootstrapped) {
        const { data } = await apolloClient.query<{
          bootstrap_delegation_states: BootstrapDelegationState[];
        }>({
          query: GET_BOOTSTRAP_DELEGATIONS_BY_ASSET,
          variables: { stakerId, assetId },
          fetchPolicy: "network-only", // TanStack Query handles caching
        });

        const rawDelegations = data?.bootstrap_delegation_states ?? [];

        // Merge optimistic updates BEFORE transformation
        // This is more natural because:
        // 1. Raw GraphQL data has all fields (updated_at_block, delegated, etc.)
        // 2. Merge works on the source-of-truth structure
        // 3. Transformation filters zero delegations, so merging first ensures we don't lose optimistic updates
        const mergedRawDelegations = mergeDelegations(rawDelegations, pendingTxs);

        // Store merged delegations for cleanup effect (needs updated_at_block)
        mergedDelegationsRef.current = mergedRawDelegations;

        // Transform merged raw data to DelegationsPerToken
        // This happens after merge so operators are available and transformation is done once
        const transformedDelegations = transformBootstrapDelegationsToDelegationsPerToken(
          mergedRawDelegations,
          token,
          queryAddress,
          operators || [],
        );

        return transformedDelegations;
      }

      // This should never be reached, but TypeScript needs it
      throw new Error("Unexpected state: neither bootstrap nor post-bootstrap");
    },
    enabled:
      !!queryAddress && !!token.address && !!customChainId && !!bootstrapStatus,
    refetchInterval: 30000, // Aligned with useStakerBalances (30 seconds)
  });

  // Clean up expired transactions in useEffect (side effect should not be in render/queryFn).
  // Use a ref to only run cleanup when block heights actually change; otherwise store update
  // causes re-renders and new data reference would re-run the effect in a loop.
  const lastDelegationBlockHeightsKeyRef = useRef<string>("");
  useEffect(() => {
    if (query.data && !bootstrapStatus?.isBootstrapped && mergedDelegationsRef.current.length > 0) {
      const delegationBlockHeights = new Map<string, number>();
      mergedDelegationsRef.current.forEach((delegation) => {
        const delegationKey = `${delegation.staker_id.toLowerCase()}_${delegation.asset_id.toLowerCase()}_${delegation.operator_addr.toLowerCase()}`;
        delegationBlockHeights.set(
          delegationKey,
          delegation.updated_at_block ?? 0,
        );
      });
      const key = [...delegationBlockHeights.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join(",");
      if (key === lastDelegationBlockHeightsKeyRef.current) return;
      lastDelegationBlockHeightsKeyRef.current = key;
      optimisticCache.clearExpiredTransactions(delegationBlockHeights);
    }
  }, [query.data, bootstrapStatus?.isBootstrapped, optimisticCache]);

  return query;
}
