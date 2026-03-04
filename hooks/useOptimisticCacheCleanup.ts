import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useOptimisticCacheStore } from "@/stores/optimisticCacheStore";
import { useBootstrapStatus } from "./useBootstrapStatus";

/**
 * Hook to handle cleanup of optimistic cache
 * - Clears cache when bootstrap phase ends
 * - Clears cache for previous chain when EVM chain changes
 * - Periodic cleanup is handled by data fetching hooks
 */
export function useOptimisticCacheCleanup() {
  const optimisticCache = useOptimisticCacheStore();
  const { bootstrapStatus } = useBootstrapStatus();
  const { chain } = useAccount();
  
  // Track previous chain ID to detect changes
  const previousChainIdRef = useRef<number | undefined>(chain?.id);

  // Clear all optimistic cache when bootstrap phase ends
  useEffect(() => {
    if (bootstrapStatus?.isBootstrapped) {
      optimisticCache.clearAll();
    }
  }, [bootstrapStatus?.isBootstrapped, optimisticCache]);

  // Clear cache for previous chain when EVM chain changes
  useEffect(() => {
    const currentChainId = chain?.id;
    const previousChainId = previousChainIdRef.current;
    
    // If chain changed and we had a previous chain, clear its cache
    if (previousChainId !== undefined && 
        currentChainId !== undefined && 
        previousChainId !== currentChainId) {
      console.log(`Chain changed from ${previousChainId} to ${currentChainId}, clearing optimistic cache for previous chain`);
      optimisticCache.clearByChainId(previousChainId);
    }
    
    // Update the ref for next comparison
    previousChainIdRef.current = currentChainId;
  }, [chain?.id, optimisticCache]);

  // Note: Periodic cleanup is handled by hooks when they fetch GraphQL data
  // Each hook calls clearExpiredTransactions() with the actual indexer block height
  // This ensures cleanup happens based on real indexer state, not time-based estimates
}
