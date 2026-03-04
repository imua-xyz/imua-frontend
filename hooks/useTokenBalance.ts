import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useAppKitBalance } from "@reown/appkit/react";
import { useXrplStore } from "@/stores/xrplClient";
import { Token } from "@/types/tokens";
import { EVMLSTToken } from "@/types/tokens";
import { usePortalContract } from "./usePortalContract";
import { ESPLORA_API_URL } from "@/config/bitcoin";

export interface TokenBalanceData {
  value: bigint;
  decimals: number;
  symbol: string;
}

interface UseTokenBalanceOptions {
  token: Token;
  address?: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export function useTokenBalance({
  token,
  address,
  enabled = true,
  refetchInterval,
}: UseTokenBalanceOptions) {
  const { address: connectedAddress } = useAccount();
  const effectiveAddress = address || connectedAddress;

  // Get network-specific clients
  const { publicClient } = usePortalContract(token.network);
  const { getAccountInfo } = useXrplStore();
  const { fetchBalance } = useAppKitBalance();

  return useQuery({
    queryKey: [
      "tokenBalance",
      token.network.customChainIdByImua,
      token.address,
      effectiveAddress,
    ],
    queryFn: async (): Promise<TokenBalanceData> => {
      if (!effectiveAddress) {
        throw new Error("Address not available");
      }

      // Route to appropriate balance fetcher based on token type and network
      if (token.type === "lst" && "evmChainID" in token.network) {
        // EVM LST tokens (wstETH, imETH, etc.)
        return await fetchEVMLSTBalance(
          token as EVMLSTToken,
          effectiveAddress,
          publicClient,
        );
      } else if (token.type === "native" && "evmChainID" in token.network) {
        // EVM native tokens (ETH, etc.)
        return await fetchEVMNativeBalance(effectiveAddress, publicClient);
      } else if (token.symbol === "XRP") {
        // XRP native token
        return await fetchXRPNativeBalance(effectiveAddress, getAccountInfo);
      } else if (token.symbol === "BTC" || token.symbol === "tBTC") {
        // Bitcoin native tokens
        return await fetchBitcoinNativeBalance(effectiveAddress, fetchBalance);
      } else {
        throw new Error(
          `Unsupported token type: ${token.type} for ${token.symbol}`,
        );
      }
    },
    enabled: enabled && !!effectiveAddress,
    refetchInterval,
    retry: 2,
    staleTime: 10000, // 10 seconds
  });
}

// EVM LST token balance fetcher
async function fetchEVMLSTBalance(
  token: EVMLSTToken,
  address: string,
  publicClient: any,
): Promise<TokenBalanceData> {
  if (!publicClient) {
    throw new Error("Public client not available");
  }

  try {
    // Use ERC20 balanceOf function
    const balance = await publicClient.readContract({
      address: token.address,
      abi: [
        {
          inputs: [{ name: "account", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });

    return {
      value: balance as bigint,
      decimals: token.decimals,
      symbol: token.symbol,
    };
  } catch (error) {
    console.error("Failed to fetch EVM LST balance:", error);
    return {
      value: BigInt(0),
      decimals: token.decimals,
      symbol: token.symbol,
    };
  }
}

// EVM native token balance fetcher
async function fetchEVMNativeBalance(
  address: string,
  publicClient: any,
): Promise<TokenBalanceData> {
  if (!publicClient) {
    throw new Error("Public client not available");
  }

  try {
    const balance = await publicClient.getBalance({
      address: address as `0x${string}`,
    });

    return {
      value: balance,
      decimals: 18, // EVM native tokens typically have 18 decimals
      symbol: "ETH", // Default to ETH, could be made configurable
    };
  } catch (error) {
    console.error("Failed to fetch EVM native balance:", error);
    return {
      value: BigInt(0),
      decimals: 18,
      symbol: "ETH",
    };
  }
}

// XRP native balance fetcher
async function fetchXRPNativeBalance(
  address: string,
  getAccountInfo: any,
): Promise<TokenBalanceData> {
  if (!getAccountInfo) {
    throw new Error("XRP client not available");
  }

  try {
    const accountInfo = await getAccountInfo(address);
    if (!accountInfo.success) {
      throw new Error("Failed to fetch XRP account info");
    }

    return {
      value: accountInfo.data?.balance || BigInt(0),
      decimals: 6, // XRP has 6 decimal places
      symbol: "XRP",
    };
  } catch (error) {
    console.error("Failed to fetch XRP balance:", error);
    return {
      value: BigInt(0),
      decimals: 6,
      symbol: "XRP",
    };
  }
}

// Bitcoin native balance fetcher
async function fetchBitcoinNativeBalance(
  address: string,
  fetchBalance: any,
): Promise<TokenBalanceData> {
  if (!fetchBalance) {
    throw new Error("Bitcoin wallet not available");
  }

  try {
    // Try AppKit balance first
    const balanceData = await fetchBalance();
    const btcBalance = parseFloat(balanceData.data?.balance || "0");
    const satoshis = Math.floor(btcBalance * 1e8);

    return {
      value: BigInt(satoshis),
      decimals: 8, // Bitcoin has 8 decimal places
      symbol: balanceData.data?.symbol || "BTC",
    };
  } catch (error) {
    console.error("Failed to fetch Bitcoin balance via AppKit:", error);

    // Fallback to Esplora API
    try {
      const response = await fetch(`${ESPLORA_API_URL}/address/${address}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const addressData = await response.json();

      // Calculate confirmed balance: funded_txo_sum - spent_txo_sum
      const confirmedBalance =
        addressData.chain_stats.funded_txo_sum -
        addressData.chain_stats.spent_txo_sum;

      // Calculate mempool balance: mempool_funded_txo_sum - mempool_spent_txo_sum
      const mempoolBalance =
        addressData.mempool_stats.funded_txo_sum -
        addressData.mempool_stats.spent_txo_sum;

      // Total balance = confirmed + mempool
      const netBalance = confirmedBalance + mempoolBalance;

      return {
        value: BigInt(netBalance),
        decimals: 8,
        symbol: "BTC",
      };
    } catch (esploraError) {
      console.error(
        "Failed to fetch Bitcoin balance via Esplora:",
        esploraError,
      );
      return {
        value: BigInt(0),
        decimals: 8,
        symbol: "BTC",
      };
    }
  }
}
