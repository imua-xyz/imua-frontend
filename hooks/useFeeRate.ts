"use client";

import { useQuery } from "@tanstack/react-query";
import { ESPLORA_API_URL, IS_BITCOIN_TESTNET } from "@/config/bitcoin";

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

// Fallback fee rate (works well for testnet)
const FALLBACK_FEE_RATE: FeeRate = { blocks: 6, feeRate: 1.5 };

// Fee strategies configuration
const FEE_STRATEGIES = {
  fast: { maxBlocks: 2, priority: "speed" },
  balanced: { maxBlocks: 6, priority: "balanced" },
  economical: { maxBlocks: 12, priority: "cost" },
} as const;

/**
 * Get real-time fee rates for all strategies in a single request.
 * For testnet, returns a fallback value that works well; for mainnet, fetches from Esplora API.
 */
export async function getFeeRates(): Promise<FeeRates> {
  if (IS_BITCOIN_TESTNET) {
    return {
      fast: FALLBACK_FEE_RATE,
      balanced: FALLBACK_FEE_RATE,
      economical: FALLBACK_FEE_RATE,
    };
  }

  if (!ESPLORA_API_URL) {
    throw new Error("Esplora API URL not configured");
  }

  const res = await fetch("https://blockstream.info/api/fee-estimates");
  if (!res.ok) {
    throw new Error(`Failed to fetch fee estimates: ${res.statusText}`);
  }

  const raw: Record<string, number> = await res.json();
  const entries: FeeRate[] = Object.entries(raw)
    .map(
      ([blocksStr, feeRate]): FeeRate => ({
        blocks: parseInt(blocksStr),
        feeRate: feeRate,
      }),
    )
    .sort((a, b) => a.blocks - b.blocks);

  if (entries.length === 0) {
    return {
      fast: FALLBACK_FEE_RATE,
      balanced: FALLBACK_FEE_RATE,
      economical: FALLBACK_FEE_RATE,
    };
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
    fast: calculateStrategy("fast"),
    balanced: calculateStrategy("balanced"),
    economical: calculateStrategy("economical"),
  };
}

/**
 * Hook for UI preview (cached)
 */
export function useFeeRates() {
  return useQuery({
    queryKey: ["fee-rates", IS_BITCOIN_TESTNET],
    queryFn: getFeeRates,
    enabled: IS_BITCOIN_TESTNET || !!ESPLORA_API_URL,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}
