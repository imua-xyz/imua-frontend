// components/new-staking/providers/StakingServiceProvider.tsx
import { ReactNode } from "react";
import { Token, exoETH, wstETH, xrp, btc, tbtc } from "@/types/tokens";
import { EVMLSTStakingProvider } from "./EVMLSTStakingProvider";
import { XRPStakingProvider } from "./XRPStakingProvider";
import { BitcoinStakingProvider } from "./BitcoinStakingProvider";

interface StakingServiceProviderProps {
  token: Token;
  children: ReactNode;
}

export function StakingServiceProvider({
  token,
  children,
}: StakingServiceProviderProps) {
  // Render the appropriate provider based on token
  if (token === exoETH || token === wstETH) {
    return (
      <EVMLSTStakingProvider token={token}>{children}</EVMLSTStakingProvider>
    );
  }

  if (token === xrp) {
    return <XRPStakingProvider>{children}</XRPStakingProvider>;
  }

  if (token === btc || token === tbtc) {
    return <BitcoinStakingProvider>{children}</BitcoinStakingProvider>;
  }

  // Fallback for unsupported tokens
  return <div>Unsupported token: {token.symbol}</div>;
}
