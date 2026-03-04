// components/new-staking/providers/StakingServiceProvider.tsx
import { ReactNode } from "react";
import {
  Token,
  exoETH,
  wstETH,
  xrp,
  btc,
  tbtc,
  ethNSTlocal,
  EVMLSTToken,
  EVMNSTToken,
  ethNSTHoodi,
} from "@/types/tokens";
import { EVMLSTStakingProvider } from "./EVMLSTStakingProvider";
import { EVMNSTStakingProvider } from "./EVMNSTStakingProvider";
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
  // Render the appropriate provider based on token reference equality
  if (token === exoETH || token === wstETH) {
    return (
      <EVMLSTStakingProvider token={token as EVMLSTToken}>
        {children}
      </EVMLSTStakingProvider>
    );
  }

  if (token === ethNSTlocal || token === ethNSTHoodi) {
    return (
      <EVMNSTStakingProvider token={token as EVMNSTToken}>
        {children}
      </EVMNSTStakingProvider>
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
