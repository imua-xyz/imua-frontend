import { getContract } from "viem";
import { EVMLSTToken } from "@/types/tokens";
import { usePortalContract } from "./usePortalContract";
import { useQuery } from "@tanstack/react-query";
import VaultABI from "@/abi/Vault.abi.json";

export function useEVMVault(token: EVMLSTToken) {
  const { readonlyContract, publicClient } = usePortalContract(token.network);

  // Optimized vault address caching - permanent once fetched
  const { data: vaultAddress } = useQuery({
    queryKey: ["vaultAddress", token.network.evmChainID, token.address],
    queryFn: async (): Promise<`0x${string}`> => {
      if (!readonlyContract) throw new Error("Invalid Contract");
      const vaultAddress = await readonlyContract.read.tokenToVault([
        token.address,
      ]);
      return vaultAddress as `0x${string}`;
    },
    enabled: !!token && !!readonlyContract,
    staleTime: Infinity, // ✅ Never consider data stale - vault addresses are permanent
    gcTime: Infinity, // ✅ Never garbage collect - keep in memory permanently
    refetchOnMount: false, // ✅ Don't refetch on mount if already cached
    refetchOnWindowFocus: false, // ✅ Don't refetch on focus if already cached
    refetchOnReconnect: false, // ✅ Don't refetch on reconnect if already cached
  });

  const vault =
    vaultAddress && publicClient
      ? getContract({
          address: vaultAddress as `0x${string}`,
          abi: VaultABI,
          client: {
            public: publicClient,
          },
        })
      : undefined;

  return {
    vaultAddress,
    vault,
  };
}
