import { useEffect, useMemo, useRef } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useAssetsPrecompile } from "./useAssetsPrecompile";
import { StakerBalanceResponseFromPrecompile } from "@/types/staking";
import { Token } from "@/types/tokens";
import { getQueryStakerAddress } from "@/stores/allWalletsStore";
import { useBootstrapStatus } from "./useBootstrapStatus";
import { apolloClient } from "@/lib/graphql/client";
import { GET_BOOTSTRAP_STAKER_ASSETS } from "@/lib/graphql/queries";
import { BootstrapStakerAsset } from "@/lib/graphql/schema";
import {
  useOptimisticCacheStore,
  useAllPendingTransactions,
} from "@/stores/optimisticCacheStore";
import { mergeStakerAssets } from "@/lib/optimistic-merge";

export function useStakerBalances(tokens: Token[]) {
  const { getStakerBalanceByToken } = useAssetsPrecompile();
  const { bootstrapStatus } = useBootstrapStatus();
  const { address: evmAddress, isConnected: isEVMConnected } = useAccount();

  // Helper function to get query address with EVM wallet fallback
  const getQueryAddress = (token: Token): string | undefined => {
    const { queryAddress, stakerAddress } = getQueryStakerAddress(token);

    // If query address is empty and token requires extra connect to Imua
    // and native wallet is not connected, use EVM wallet address as fallback
    if (
      !queryAddress &&
      token.network.connector.requireExtraConnectToImua &&
      !stakerAddress && // Native wallet not connected
      isEVMConnected &&
      evmAddress
    ) {
      return evmAddress;
    }

    return queryAddress;
  };

  // Get unique stakerIds for bootstrap phase
  const stakerIds = tokens.reduce((acc, token) => {
    const queryAddress = getQueryAddress(token);
    if (queryAddress && token.network.customChainIdByImua) {
      const stakerId = `${queryAddress.toLowerCase()}_0x${token.network.customChainIdByImua.toString(16)}`;
      acc.add(stakerId);
    }
    return acc;
  }, new Set<string>());

  // Fetch all staker assets once per stakerId (only in bootstrap phase)
  const stakerAssetsQueries = useQueries({
    queries: Array.from(stakerIds).map((stakerId) => ({
      queryKey: ["bootstrap_staker_assets", stakerId],
      queryFn: async () => {
        const { data } = await apolloClient.query<{
          bootstrap_staker_assets: BootstrapStakerAsset[];
        }>({
          query: GET_BOOTSTRAP_STAKER_ASSETS,
          variables: { stakerId },
          fetchPolicy: "network-only", // TanStack Query handles caching
        });
        return data?.bootstrap_staker_assets ?? [];
      },
      enabled: !!bootstrapStatus && !bootstrapStatus?.isBootstrapped,
      staleTime: 10000,
      refetchInterval: 30000,
    })),
  });

  // Get optimistic cache store (for cleanup actions)
  const optimisticCache = useOptimisticCacheStore();
  const queryClient = useQueryClient();

  // Use memoized selector for pending transactions to avoid re-renders
  const allPendingTxs = useAllPendingTransactions();

  // Stable key so bootstrap balance queries re-run when pending txs change (merge happens inside queryFn).
  const pendingTxsKey = allPendingTxs.length;

  const stakerIdArray = useMemo(() => Array.from(stakerIds), [stakerIds]);

  // Bootstrap useQueries: per token, same shape as post-bootstrap. Fetches from cache (stakerAssetsQueries), merges optimistic cache, returns StakerBalanceResponseFromPrecompile.
  const bootstrapBalanceQueries = useQueries({
    queries: tokens.map((token, _index) => {
      const queryAddress = getQueryAddress(token);
      const stakerId =
        queryAddress && token.network.customChainIdByImua
          ? `${queryAddress.toLowerCase()}_0x${token.network.customChainIdByImua.toString(16)}`
          : "";
      const assetId =
        queryAddress && token.network.customChainIdByImua && token.address
          ? `${token.address.toLowerCase()}_0x${token.network.customChainIdByImua.toString(16)}`
          : "";
      const queryIndex = stakerId ? stakerIdArray.indexOf(stakerId) : -1;
      const stakerAssetsReady =
        queryIndex >= 0 && stakerAssetsQueries[queryIndex]?.data !== undefined;

      return {
        queryKey: [
          "stakerBalanceByToken",
          queryAddress,
          token.network.customChainIdByImua,
          token.address,
          false, // bootstrap
          pendingTxsKey,
        ],
        queryFn: (): StakerBalanceResponseFromPrecompile => {
          if (
            !queryAddress ||
            !token.network.customChainIdByImua ||
            !token.address
          ) {
            throw new Error("Invalid parameters");
          }
          const rawAssets = queryClient.getQueryData<BootstrapStakerAsset[]>([
            "bootstrap_staker_assets",
            stakerId,
          ]);
          const stakerPendingTxs = allPendingTxs.filter(
            (tx) => tx.stakerId.toLowerCase() === stakerId.toLowerCase(),
          );
          const merged = mergeStakerAssets(rawAssets ?? [], stakerPendingTxs);
          const record = merged.find(
            (r) => r.asset_id.toLowerCase() === assetId.toLowerCase(),
          );
          const deposited = BigInt(record?.deposited ?? 0);
          const withdrawable = BigInt(record?.withdrawable ?? 0);
          const delegated = BigInt(record?.delegated ?? 0);
          return {
            clientChainID: token.network.customChainIdByImua,
            stakerAddress: queryAddress as `0x${string}`,
            tokenID: token.address as `0x${string}`,
            balance: deposited,
            withdrawable,
            delegated,
            pendingUndelegated: BigInt(0),
            totalDeposited: deposited,
          };
        },
        enabled:
          !!queryAddress &&
          !!token.address &&
          !!bootstrapStatus &&
          !bootstrapStatus?.isBootstrapped &&
          !!token.network.customChainIdByImua &&
          stakerAssetsReady,
        staleTime: 10000,
        refetchInterval: 30000,
      };
    }),
  });

  // Clean up expired transactions in useEffect (side effect should not be in render).
  const lastAssetBlockHeightsKeyRef = useRef<string>("");
  useEffect(() => {
    const mergedBlockHeights = new Map<string, number>();
    stakerIdArray.forEach((stakerId, index) => {
      const query = stakerAssetsQueries[index];
      if (!query?.data) return;
      const stakerPendingTxs = allPendingTxs.filter(
        (tx) => tx.stakerId.toLowerCase() === stakerId.toLowerCase(),
      );
      const merged = mergeStakerAssets(query.data, stakerPendingTxs);
      merged.forEach((asset) => {
        mergedBlockHeights.set(
          asset.asset_id.toLowerCase(),
          asset.updated_at_block ?? 0,
        );
      });
    });
    const key = [...mergedBlockHeights.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(",");
    if (key === lastAssetBlockHeightsKeyRef.current) return;
    lastAssetBlockHeightsKeyRef.current = key;
    if (mergedBlockHeights.size > 0) {
      optimisticCache.clearExpiredTransactions(mergedBlockHeights);
    }
  }, [stakerAssetsQueries, allPendingTxs, stakerIdArray, optimisticCache]);

  // Per-token balance queries: only run in post-bootstrap. In bootstrap we use stakerAssetsQueries + derived data.
  const postBootstrapResults = useQueries({
    queries: tokens.map((token) => {
      const queryAddress = getQueryAddress(token);

      return {
        queryKey: [
          "stakerBalanceByToken",
          queryAddress,
          token.network.customChainIdByImua,
          token.address,
          true, // post-bootstrap only
        ],
        queryFn: async (): Promise<StakerBalanceResponseFromPrecompile> => {
          if (
            !queryAddress ||
            !token.network.customChainIdByImua ||
            !token.address
          ) {
            throw new Error("Invalid parameters");
          }
          const stakerBalanceResponse = await getStakerBalanceByToken(
            queryAddress as `0x${string}`,
            token.network.customChainIdByImua,
            token.address as `0x${string}`,
          );
          return stakerBalanceResponse;
        },
        enabled:
          !!queryAddress &&
          !!token.address &&
          !!bootstrapStatus?.isBootstrapped &&
          !!token.network.customChainIdByImua,
        refetchInterval: 30000,
        staleTime: 20000,
      };
    }),
  });

  // Bootstrap: return bootstrap useQueries (same shape as post-bootstrap). Wrap refetch to refetch GraphQL staker assets first.
  if (!bootstrapStatus?.isBootstrapped) {
    return bootstrapBalanceQueries.map((result, index) => {
      const token = tokens[index];
      const queryAddress = getQueryAddress(token);
      const stakerId =
        queryAddress && token.network.customChainIdByImua
          ? `${queryAddress.toLowerCase()}_0x${token.network.customChainIdByImua.toString(16)}`
          : "";
      const refetchWithGraphQL = async () => {
        if (stakerId) {
          await queryClient.refetchQueries({
            queryKey: ["bootstrap_staker_assets", stakerId],
          });
        }
        return result.refetch();
      };
      return { ...result, refetch: refetchWithGraphQL };
    });
  }

  return postBootstrapResults;
}
