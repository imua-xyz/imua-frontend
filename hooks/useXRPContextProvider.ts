import { TokenInfo, StakingContext } from "@/types/staking";
import { XRP_TOKEN_ADDRESS } from "@/config/xrp";

export function useXRPContextProvider(): StakingContext {
  const whitelistedTokens: TokenInfo[] = [
    {
      address: XRP_TOKEN_ADDRESS,
      name: 'XRP',
      symbol: 'XRP',
      decimals: 6
    }
  ]

  return {
    whitelistedTokens,
    isConnected: true,
    isLoading: false,
    isStakingEnabled: true
  }
}