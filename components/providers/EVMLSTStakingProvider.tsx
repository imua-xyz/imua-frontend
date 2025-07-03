// components/new-staking/providers/EVMLSTStakingProvider.tsx
import { ReactNode, useMemo } from 'react';
import { useEVMLSTStaking } from '@/hooks/useEVMLSTStaking';
import { StakingServiceContext } from '@/contexts/StakingServiceContext';
import { EVMLSTToken } from '@/types/tokens';

interface EVMLSTStakingProviderProps {
  token: EVMLSTToken;
  children: ReactNode;
}

export function EVMLSTStakingProvider({ token, children }: EVMLSTStakingProviderProps) {
  const service = useEVMLSTStaking(token);
  
  return (
    <StakingServiceContext.Provider value={service}>
      {children}
    </StakingServiceContext.Provider>
  );
}