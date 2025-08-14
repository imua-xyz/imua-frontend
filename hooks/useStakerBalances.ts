import { useQueries } from "@tanstack/react-query";
import { useAssetsPrecompile } from "./useAssetsPrecompile";
import { StakerBalanceResponseFromPrecompile } from "@/types/staking";
import { Token } from "@/types/tokens";
import { getQueryStakerAddress } from "@/stores/allWalletsStore";

export function useStakerBalances(tokens: Token[]) {
  const { getStakerBalanceByToken } = useAssetsPrecompile();

  const results = useQueries({
    queries: tokens.map((token) => {
      const { queryAddress, stakerAddress } = getQueryStakerAddress(token);
      return {
        queryKey: [
          "stakerBalanceByToken",
          queryAddress,
          token.network.customChainIdByImua,
          token.address,
        ],
        queryFn: async (): Promise<StakerBalanceResponseFromPrecompile> => {
          if (
            !queryAddress ||
            !token.network.customChainIdByImua ||
            !token.address
          )
            throw new Error("Invalid parameters");

          const stakerBalanceResponse = await getStakerBalanceByToken(
            queryAddress as `0x${string}`,
            token.network.customChainIdByImua,
            token.address as `0x${string}`,
          );
          return stakerBalanceResponse;
        },
        enabled:
          !!queryAddress &&
          !!token.network.customChainIdByImua &&
          !!token.address,
        refetchInterval: 3000,
      };
    }),
  });

  return results;
}
