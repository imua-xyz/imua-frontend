// components/new-staking/providers/XRPStakingProvider.tsx
import { ReactNode } from 'react';
import { useXRPStaking } from '@/hooks/useXRPStaking';
import { StakingServiceContext } from '@/contexts/StakingServiceContext';
import { NativeToken } from '@/types/tokens';
import { useXRPBinding } from "@/hooks/useXRPBinding"; 

interface XRPStakingProviderProps {
  children: ReactNode;
}

export function XRPStakingProvider({ children }: XRPStakingProviderProps) {
  useXRPBinding();
  const service = useXRPStaking();
  
  return (
    <StakingServiceContext.Provider value={service}>
      {children}
    </StakingServiceContext.Provider>
  );
}