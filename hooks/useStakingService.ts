// hooks/useStakingService.ts
import { useMemo } from 'react';
import { StakingService } from '@/types/staking-service';
import { Token, exoETH, wstETH, xrp } from '@/types/tokens';
import { useEVMLSTStaking } from './useEVMLSTStaking';
import { useXRPStaking } from './useXRPStaking';

/**
 * Entry point hook for accessing staking functionality for any supported token
 */
export function useStakingService(token: Token): {
  service: StakingService | null;
  error?: string;
} {
  // Initialize with null and populate based on token type
  return useMemo(() => {
    if ( token === exoETH || token === wstETH ) {
      return { 
        service: useEVMLSTStaking(token),
      };
    }

    if ( token === xrp ) {
      return { 
        service: useXRPStaking(),
      };
    }
    
    // Unsupported token
    return {
      service: null,
      error: `Unsupported token type: ${token.symbol}`
    };
  }, [token]);
}