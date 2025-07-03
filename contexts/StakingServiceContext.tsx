// contexts/StakingServiceContext.tsx
import { createContext, useContext } from "react";
import { StakingService } from "@/types/staking-service";

export const StakingServiceContext = createContext<StakingService | null>(null);

export function useStakingServiceContext() {
  const context = useContext(StakingServiceContext);
  if (!context) {
    throw new Error(
      "useStakingServiceContext must be used within a StakingServiceProvider",
    );
  }
  return context;
}
