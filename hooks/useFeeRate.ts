"use client";

import { useQuery } from "@tanstack/react-query";
import { ESPLORA_API_URL } from "@/config/bitcoin";

export interface FeeRate {
  blocks: number;
  feeRate: number; // sat/vB
}

export type FeeStrategy = "fast" | "balanced" | "economical";

export interface FeeRates {
  fast: FeeRate;
  balanced: FeeRate;
  economical: FeeRate;
}

// Fee strategies configuration
const FEE_STRATEGIES = {
  fast: { maxBlocks: 2, priority: "speed" },
  balanced: { maxBlocks: 6, priority: "balanced" },
  economical: { maxBlocks: 12, priority: "cost" },
} as const;

/**
 * Get real-time fee rates for all strategies in a single request
 */
export async function getFeeRates(): Promise<FeeRates> {
  if (!ESPLORA_API_URL) {
    throw new Error("Esplora API URL not configured");
  }

  const res = await fetch("https://blockstream.info/testnet/api/fee-estimates");
  if (!res.ok) {
    throw new Error(`Failed to fetch fee estimates: ${res.statusText}`);
  }

  const raw: Record<string, number> = await res.json();
  console.log("Raw fee rates:", raw);
  const entries: FeeRate[] = Object.entries(raw)
    .map(
      ([blocksStr, feeRate]): FeeRate => ({
        blocks: parseInt(blocksStr),
        feeRate: feeRate,
      }),
    )
    .sort((a, b) => a.blocks - b.blocks);

  const fallback: FeeRate = { blocks: 6, feeRate: 1.5 };
  if (entries.length === 0) {
    return { fast: fallback, balanced: fallback, economical: fallback };
  }

  // Calculate fee rate for each strategy
  const calculateStrategy = (strategy: FeeStrategy): FeeRate => {
    const config = FEE_STRATEGIES[strategy];

    if (config.priority === "speed") {
      return entries.find((e) => e.blocks <= config.maxBlocks) || entries[0];
    }

    if (config.priority === "cost") {
      const candidates = entries.filter((e) => e.blocks <= config.maxBlocks);
      return candidates[candidates.length - 1] || entries[0];
    }

    // Balanced strategy
    const candidates = entries.filter((e) => e.blocks <= config.maxBlocks);
    if (candidates.length >= 3) {
      const mid = Math.floor(candidates.length / 2);
      return candidates[mid];
    }
    return candidates[0] || entries[0];
  };

  return {
    fast: fallback,
    balanced: fallback,
    economical: fallback,
  };
}

/**
 * Hook for UI preview (cached)
 */
export function useFeeRates() {
  return useQuery({
    queryKey: ["fee-rates"],
    queryFn: getFeeRates,
    enabled: !!ESPLORA_API_URL,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}
