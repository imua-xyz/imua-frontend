import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { useMemo } from "react";
import {
  OptimisticCacheState,
  PendingTransaction,
} from "@/types/optimistic-cache";
import {
  affectsStakerAssetRecord,
  affectsDelegations,
} from "@/types/operations";

export const useOptimisticCacheStore = create<OptimisticCacheState>()(
  persist(
    (set, get) => ({
      // State: Map stored as Record for serialization
      pendingTransactions: {},

      // Add a pending transaction
      addPendingTransaction: (tx: PendingTransaction) => {
        set((state) => ({
          pendingTransactions: {
            ...state.pendingTransactions,
            [tx.txHash]: tx,
          },
        }));
      },

      // Remove a pending transaction
      removePendingTransaction: (txHash: string) => {
        set((state) => {
          const newTransactions = { ...state.pendingTransactions };
          delete newTransactions[txHash];
          return { pendingTransactions: newTransactions };
        });
      },

      // Get pending transactions for a specific staker and asset
      getPendingTransactions: (stakerId: string, assetId: string) => {
        const state = get();
        return Object.values(state.pendingTransactions).filter(
          (tx) =>
            tx.stakerId.toLowerCase() === stakerId.toLowerCase() &&
            tx.assetId.toLowerCase() === assetId.toLowerCase(),
        );
      },

      // Get all pending transactions
      getAllPendingTransactions: () => {
        const state = get();
        return Object.values(state.pendingTransactions);
      },

      // Clear expired transactions based on per-record block heights
      // This is called with a map of assetId/delegationKey -> updated_at_block
      // Transactions are cleared if they've been indexed for ALL affected records
      clearExpiredTransactions: (
        recordBlockHeights: Map<string, number>, // Map of record key -> updated_at_block
      ) => {
        set((state) => {
          const newTransactions: Record<string, PendingTransaction> = {};
          Object.entries(state.pendingTransactions).forEach(([txHash, tx]) => {
            // Check if this transaction has been indexed for all its affected records
            let shouldKeep = false;

            // For staker asset transactions (deposit, stake, claim, withdraw), check against assetId
            if (affectsStakerAssetRecord(tx.operation)) {
              const assetBlockHeight =
                recordBlockHeights.get(tx.assetId.toLowerCase()) ?? 0;
              if (tx.blockHeight > assetBlockHeight) {
                shouldKeep = true;
              }
            }

            // For delegation transactions (stake, delegate, undelegate), check against operator
            if (affectsDelegations(tx.operation) && tx.operatorAddress) {
              // Delegation key format: `${stakerId}_${assetId}_${operatorAddr}`
              const delegationKey = `${tx.stakerId.toLowerCase()}_${tx.assetId.toLowerCase()}_${tx.operatorAddress.toLowerCase()}`;
              const delegationBlockHeight =
                recordBlockHeights.get(delegationKey) ?? 0;
              if (tx.blockHeight > delegationBlockHeight) {
                shouldKeep = true;
              }
            }

            // Keep transaction if it hasn't been indexed for at least one affected record
            if (shouldKeep) {
              newTransactions[txHash] = tx;
            }
          });
          return { pendingTransactions: newTransactions };
        });
      },

      // Clear all pending transactions
      clearAll: () => {
        set({ pendingTransactions: {} });
      },

      // Clear transactions for a specific chain (useful for network switches)
      // Note: Each staker can have one wallet per chain, but multiple wallets across chains
      // We identify chain by checking if stakerId or assetId contains the chain ID hex
      clearByChainId: (chainId: number) => {
        set((state) => {
          const chainIdHex = `0x${chainId.toString(16)}`;
          const newTransactions: Record<string, PendingTransaction> = {};
          Object.entries(state.pendingTransactions).forEach(([txHash, tx]) => {
            // Keep transactions that don't match this chain ID
            // Both stakerId and assetId contain chain ID: `${address}_0x${chainId.toString(16)}`
            const stakerMatchesChain = tx.stakerId.includes(chainIdHex);
            const assetMatchesChain = tx.assetId.includes(chainIdHex);
            if (!stakerMatchesChain && !assetMatchesChain) {
              newTransactions[txHash] = tx;
            }
          });
          return { pendingTransactions: newTransactions };
        });
      },
    }),
    {
      name: "optimistic-cache-storage",
      partialize: (state) => ({
        // Persist only pending transactions
        pendingTransactions: state.pendingTransactions,
      }),
    },
  ),
);

// ============================================
// Memoized Selectors for Optimistic Cache
// ============================================

/**
 * Selector to get pending transactions for a specific staker
 * Uses useShallow to prevent unnecessary re-renders when unrelated state changes
 */
export function usePendingTransactionsForStaker(stakerId: string) {
  const pendingTransactions = useOptimisticCacheStore(
    useShallow((state) => state.pendingTransactions),
  );

  return useMemo(() => {
    if (!stakerId) return [];
    return Object.values(pendingTransactions).filter(
      (tx) => tx.stakerId.toLowerCase() === stakerId.toLowerCase(),
    );
  }, [pendingTransactions, stakerId]);
}

/**
 * Selector to get pending transactions for a specific staker and asset
 * Uses useShallow to prevent unnecessary re-renders when unrelated state changes
 */
export function usePendingTransactionsForStakerAsset(
  stakerId: string,
  assetId: string,
) {
  const pendingTransactions = useOptimisticCacheStore(
    useShallow((state) => state.pendingTransactions),
  );

  return useMemo(() => {
    if (!stakerId || !assetId) return [];
    return Object.values(pendingTransactions).filter(
      (tx) =>
        tx.stakerId.toLowerCase() === stakerId.toLowerCase() &&
        tx.assetId.toLowerCase() === assetId.toLowerCase(),
    );
  }, [pendingTransactions, stakerId, assetId]);
}

/**
 * Selector to get all pending transactions as an array
 * Uses useShallow to prevent unnecessary re-renders
 */
export function useAllPendingTransactions() {
  const pendingTransactions = useOptimisticCacheStore(
    useShallow((state) => state.pendingTransactions),
  );

  return useMemo(() => {
    return Object.values(pendingTransactions);
  }, [pendingTransactions]);
}
