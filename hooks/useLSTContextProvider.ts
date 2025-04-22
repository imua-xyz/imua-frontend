import { useWhitelistedTokens } from "./useWhitelistedTokens";
import { StakingContext } from "@/types/staking";

export function useLSTContextProvider(): StakingContext {
  const {
    tokens: whitelistedTokens,
    isConnected,
    isLoading,
  } = useWhitelistedTokens();

  return {
    whitelistedTokens: whitelistedTokens || [],
    isConnected: isConnected || false,
    isLoading: isLoading || false,
    isStakingEnabled: !!whitelistedTokens && whitelistedTokens.length > 0,
  };
}
