import { useQuery } from "@tanstack/react-query";
import { useAssetsPrecompile } from "./useAssetsPrecompile";
import { StakerBalanceResponseFromPrecompile } from "@/types/staking";

export function useStakerBalanceByToken(
  userAddress: `0x${string}`,
  endpointId: number,
  tokenAddress: `0x${string}`,
): {
  data: StakerBalanceResponseFromPrecompile | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { getStakerBalanceByToken } = useAssetsPrecompile();

  return useQuery({
    queryKey: ["stakerBalanceByToken", userAddress, endpointId, tokenAddress],
    queryFn: async () => {
      const { success, stakerBalanceResponse } = await getStakerBalanceByToken(
        userAddress,
        endpointId,
        tokenAddress,
      );
      if (!success || !stakerBalanceResponse) {
        return {
          clientChainID: endpointId,
          stakerAddress: userAddress,
          tokenID: tokenAddress,
          balance: BigInt(0),
          withdrawable: BigInt(0),
          delegated: BigInt(0),
          pendingUndelegated: BigInt(0),
          totalDeposited: BigInt(0),
        };
      }
      return stakerBalanceResponse as StakerBalanceResponseFromPrecompile;
    },
    enabled: !!userAddress && !!endpointId && !!tokenAddress,
    refetchInterval: 30000,
  });
}
