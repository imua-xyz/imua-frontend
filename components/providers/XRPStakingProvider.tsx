// components/new-staking/providers/XRPStakingProvider.tsx
import { ReactNode } from "react";
import { useXRPStaking } from "@/hooks/useXRPStaking";
import { StakingServiceContext } from "@/contexts/StakingServiceContext";

interface XRPStakingProviderProps {
  children: ReactNode;
}

export function XRPStakingProvider({ children }: XRPStakingProviderProps) {
  const service = useXRPStaking();

  return (
    <StakingServiceContext.Provider value={service}>
      {children}
    </StakingServiceContext.Provider>
  );
}
