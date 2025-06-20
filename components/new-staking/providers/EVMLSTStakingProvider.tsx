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
  const rawService = useEVMLSTStaking(token);
  const service = useMemo(() => rawService, [rawService]);
  console.log("DEBUG: EVMLSTStakingProvider is rendered");
  
  return (
    <StakingServiceContext.Provider value={service}>
      {children}
    </StakingServiceContext.Provider>
  );
}