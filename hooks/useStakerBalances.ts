import { useQueries, useQuery } from "@tanstack/react-query";
import { useAssetsPrecompile } from "./useAssetsPrecompile";
import { StakerBalanceResponseFromPrecompile } from "@/types/staking";

export interface StakerBalanceQuery {
  userAddress: string | null | undefined;
  endpointId: number | null | undefined;
  tokenAddress: string | null | undefined;
}

export function useStakerBalances(
  queries: StakerBalanceQuery[],
) {
  const { getStakerBalanceByToken } = useAssetsPrecompile();

  const results = useQueries({
    queries: queries.map((query) => ({
      queryKey: ["stakerBalanceByToken", query.userAddress, query.endpointId, query.tokenAddress],
      queryFn: async (): Promise<StakerBalanceResponseFromPrecompile> => {
        if (!query.userAddress || !query.endpointId || !query.tokenAddress)
          throw new Error("Invalid parameters");

        const stakerBalanceResponse = await getStakerBalanceByToken(query.userAddress as `0x${string}`, query.endpointId, query.tokenAddress as `0x${string}`);
        return stakerBalanceResponse;
      },
      enabled: !!query.userAddress && !!query.endpointId && !!query.tokenAddress,
      refetchInterval: 3000,
    })),
  });

  return results;
} 

