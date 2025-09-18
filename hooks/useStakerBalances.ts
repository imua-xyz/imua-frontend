import { useQueries, useQuery } from "@tanstack/react-query";
import { useAssetsPrecompile } from "./useAssetsPrecompile";
import { StakerBalanceResponseFromPrecompile } from "@/types/staking";
import { Token } from "@/types/tokens";
import { getQueryStakerAddress } from "@/stores/allWalletsStore";
import { useBootstrapStatus } from "./useBootstrapStatus";
import { apolloClient } from "@/lib/graphql/client";
import { GET_BOOTSTRAP_STAKER_ASSETS } from "@/lib/graphql/queries";
import { BootstrapStakerAsset } from "@/lib/graphql/schema";

export function useStakerBalances(tokens: Token[]) {
  const { getStakerBalanceByToken } = useAssetsPrecompile();
  const { bootstrapStatus } = useBootstrapStatus();

  // Get unique stakerIds for bootstrap phase
  const stakerIds = tokens.reduce((acc, token) => {
    const { queryAddress } = getQueryStakerAddress(token);
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

  // Build a map of stakerId -> assets for quick lookup
  const stakerAssetsMap = new Map<string, BootstrapStakerAsset[]>();
  stakerAssetsQueries.forEach((query, index) => {
    const stakerId = Array.from(stakerIds)[index];
    if (query.data) {
      stakerAssetsMap.set(stakerId, query.data);
    }
  });

  const results = useQueries({
    queries: tokens.map((token) => {
      const { queryAddress } = getQueryStakerAddress(token);

      return {
        queryKey: [
          "stakerBalanceByToken",
          queryAddress,
          token.network.customChainIdByImua,
          token.address,
          bootstrapStatus?.isBootstrapped, // Include bootstrap status in query key
        ],
        queryFn: async (): Promise<StakerBalanceResponseFromPrecompile> => {
          if (
            !queryAddress ||
            !token.network.customChainIdByImua ||
            !token.address
          ) {
            throw new Error("Invalid parameters");
          }

          // Bootstrap phase: use cached staker assets data
          if (!bootstrapStatus?.isBootstrapped) {
            const stakerId = `${queryAddress.toLowerCase()}_0x${token.network.customChainIdByImua.toString(16)}`;
            const assetId = `${token.address.toLowerCase()}_0x${token.network.customChainIdByImua.toString(16)}`;

            const rows = stakerAssetsMap.get(stakerId);
            const record = rows?.find(
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
          }

          // Post-bootstrap: Use Imuachain precompiles via ClientChainGateway
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
          !!bootstrapStatus &&
          (bootstrapStatus.isBootstrapped
            ? !!token.network.customChainIdByImua
            : stakerAssetsQueries.every((q) => !q.isLoading)), // Wait for staker assets in bootstrap
        refetchInterval: 3000,
      };
    }),
  });

  return results;
}
