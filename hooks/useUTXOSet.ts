"use client";

import { useQuery } from "@tanstack/react-query";
import { ESPLORA_API_URL } from "@/config/bitcoin";

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

export interface UTXOSet {
  utxos: UTXO[];
  balance: bigint;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useUTXOSet(address: string | undefined): UTXOSet {
  const {
    data: utxos = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["utxos", address],
    queryFn: async (): Promise<UTXO[]> => {
      if (!address || !ESPLORA_API_URL) {
        return [];
      }

      const response = await fetch(
        `${ESPLORA_API_URL}/address/${address}/utxo`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch UTXOs: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: !!address && !!ESPLORA_API_URL,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  const balance = utxos.reduce(
    (sum: bigint, utxo: UTXO) => sum + BigInt(utxo.value),
    BigInt(0),
  );

  return {
    utxos,
    balance,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// Helper function to select UTXOs for a transaction
export function selectUTXOs(
  utxos: UTXO[],
  requiredAmount: bigint,
): {
  selectedUTXOs: UTXO[];
  totalInputSats: bigint;
  sufficient: boolean;
} {
  let totalInputSats = BigInt(0);
  const selectedUTXOs: UTXO[] = [];

  for (const utxo of utxos) {
    selectedUTXOs.push(utxo);
    totalInputSats += BigInt(utxo.value);

    if (totalInputSats >= requiredAmount) {
      break;
    }
  }

  return {
    selectedUTXOs,
    totalInputSats,
    sufficient: totalInputSats >= requiredAmount,
  };
}
