"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import { ESPLORA_API_URL } from "@/config/bitcoin";

// Interface for full transaction data from Esplora API
export interface FullTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: Array<{
    txid: string;
    vout: number;
    prevout: any;
    scriptsig: string;
    scriptsig_asm: string;
    witness: string[];
    is_coinbase: boolean;
    sequence: number;
  }>;
  vout: Array<{
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address?: string;
    value: number;
  }>;
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

// Helper function to fetch full transaction from Esplora API
async function fetchFullTransaction(txid: string): Promise<FullTransaction> {
  if (!ESPLORA_API_URL) {
    throw new Error("Esplora API URL not configured");
  }

  const response = await fetch(`${ESPLORA_API_URL}/tx/${txid}`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch transaction ${txid}: ${response.statusText}`,
    );
  }

  return response.json();
}

// Hook to fetch a single full transaction with React Query caching
export function useFullTransaction(txid: string | undefined) {
  return useQuery({
    queryKey: ["fullTransaction", txid],
    queryFn: () => fetchFullTransaction(txid!),
    enabled: !!txid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook to fetch multiple full transactions for legacy UTXOs using useQueries
export function useFullTransactions(txids: string[]) {
  const queries = useQueries({
    queries: txids.map((txid) => ({
      queryKey: ["fullTransaction", txid],
      queryFn: () => fetchFullTransaction(txid),
      enabled: txids.length > 0,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 3,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
    })),
  });

  // Extract data, loading, and error states
  const data = queries
    .map((query) => query.data)
    .filter(Boolean) as FullTransaction[];
  const isLoading = queries.some((query) => query.isLoading);
  const error = queries.find((query) => query.error)?.error || null;
  const isError = queries.some((query) => query.isError);

  return {
    data,
    isLoading,
    error,
    isError,
    // Individual query states for more granular control
    queries,
  };
}
