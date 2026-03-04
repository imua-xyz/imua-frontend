"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import { ESPLORA_API_URL } from "@/config/bitcoin";

// Interface for raw transaction hex data from Esplora API
export interface RawTransaction {
  txid: string;
  hex: string;
}

// Helper function to fetch raw transaction hex from Esplora API
async function fetchRawTransaction(txid: string): Promise<RawTransaction> {
  if (!ESPLORA_API_URL) {
    throw new Error("Esplora API URL not configured");
  }

  const response = await fetch(`${ESPLORA_API_URL}/tx/${txid}/hex`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch transaction hex ${txid}: ${response.statusText}`,
    );
  }

  const hex = await response.text();

  return {
    txid,
    hex: hex.trim(), // Remove any whitespace/newlines
  };
}

// Hook to fetch a single raw transaction hex with React Query caching
export function useRawTransaction(txid: string | undefined) {
  return useQuery({
    queryKey: ["rawTransaction", txid],
    queryFn: () => fetchRawTransaction(txid!),
    enabled: !!txid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook to fetch multiple raw transaction hexes for legacy UTXOs using useQueries
export function useRawTransactions(txids: string[]) {
  const queries = useQueries({
    queries: txids.map((txid) => ({
      queryKey: ["rawTransaction", txid],
      queryFn: () => fetchRawTransaction(txid),
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
    .filter(Boolean) as RawTransaction[];
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
