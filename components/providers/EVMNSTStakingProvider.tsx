// components/new-staking/providers/EVMLSTStakingProvider.tsx
import { ReactNode } from "react";
import { useEVMNSTStaking } from "@/hooks/useEVMNSTStaking";
import { StakingServiceContext } from "@/contexts/StakingServiceContext";
import { EVMNSTToken } from "@/types/tokens";

interface EVMNSTStakingProviderProps {
  token: EVMNSTToken;
  children: ReactNode;
}

export function EVMNSTStakingProvider({
  token,
  children,
}: EVMNSTStakingProviderProps) {
  const service = useEVMNSTStaking(token);

  return (
    <StakingServiceContext.Provider value={service}>
      {children}
    </StakingServiceContext.Provider>
  );
}
