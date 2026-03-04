// Types for optimistic cache system

import { StakingOperation } from "./operations";

// Re-export operation type for convenience
export type OptimisticOperation = StakingOperation;

/**
 * Pending transaction stored in optimistic cache
 * Stores operation details instead of pre-calculated deltas for simplicity and explicitness
 */
export interface PendingTransaction {
  /** Transaction hash */
  txHash: string;
  /** Operation type */
  operation: OptimisticOperation;
  /** Staker ID (format: `${address}_0x${chainId}`) */
  stakerId: string;
  /** Asset ID (format: `${tokenAddress}_0x${chainId}`) */
  assetId: string;
  /** Block height when transaction was confirmed */
  blockHeight: number;
  /** Timestamp when transaction was cached */
  timestamp: number;
  /** Operation amount (serialized as string for localStorage) */
  amount: string; // bigint serialized as string
  /** Operator address (for delegate/stake/undelegate operations, optional) */
  operatorAddress?: string;
}

/**
 * Zustand store state for optimistic cache
 */
export interface OptimisticCacheState {
  /** Map of pending transactions by transaction hash */
  pendingTransactions: Record<string, PendingTransaction>;

  // Actions
  /** Add a pending transaction to cache */
  addPendingTransaction: (tx: PendingTransaction) => void;
  /** Remove a pending transaction by hash */
  removePendingTransaction: (txHash: string) => void;
  /** Get all pending transactions for a specific staker and asset */
  getPendingTransactions: (
    stakerId: string,
    assetId: string,
  ) => PendingTransaction[];
  /** Get all pending transactions (for cleanup) */
  getAllPendingTransactions: () => PendingTransaction[];
  /** Clear expired transactions (where blockHeight <= indexerBlockHeight) */
  clearExpiredTransactions: (recordBlockHeights: Map<string, number>) => void;
  /** Clear all pending transactions */
  clearAll: () => void;
  /** Clear transactions for a specific chain (on network switch) */
  clearByChainId: (chainId: number) => void;
}
