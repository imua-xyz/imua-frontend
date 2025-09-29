// components/new-staking/providers/StakingServiceProvider.tsx
import { ReactNode } from "react";
import { Token, exoETH, wstETH, xrp, ethNSTlocal, EVMLSTToken, EVMNSTToken, ethNSTHoodi } from "@/types/tokens";
import { EVMLSTStakingProvider } from "./EVMLSTStakingProvider";
import { EVMNSTStakingProvider } from "./EVMNSTStakingProvider";
import { XRPStakingProvider } from "./XRPStakingProvider";

interface StakingServiceProviderProps {
  token: Token;
  children: ReactNode;
}

export function StakingServiceProvider({
  token,
  children,
}: StakingServiceProviderProps) {
  
  // Render the appropriate provider based on token
  // Use address comparison instead of object reference comparison
  if (token.address === exoETH.address || token.address === wstETH.address) {
    return (
      <EVMLSTStakingProvider token={token as EVMLSTToken}>{children}</EVMLSTStakingProvider>
    );
  }

  if (token.address === ethNSTlocal.address || token.address === ethNSTHoodi.address) {
    return <EVMNSTStakingProvider token={token as EVMNSTToken}>{children}</EVMNSTStakingProvider>;
  }

  if (token.address === xrp.address) {
    return <XRPStakingProvider>{children}</XRPStakingProvider>;
  }

  return <div>Unsupported token: {token.symbol}</div>;
}