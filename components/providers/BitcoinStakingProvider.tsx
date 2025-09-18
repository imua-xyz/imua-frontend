import { useBitcoinStaking } from "@/hooks/useBitcoinStaking";
import { ReactNode } from "react";
import { StakingServiceContext } from "@/contexts/StakingServiceContext";

interface BitcoinStakingProviderProps {
  children: ReactNode;
}

export function BitcoinStakingProvider({
  children,
}: BitcoinStakingProviderProps) {
  const service = useBitcoinStaking();

  return (
    <StakingServiceContext.Provider value={service}>
      {children}
    </StakingServiceContext.Provider>
  );
}
