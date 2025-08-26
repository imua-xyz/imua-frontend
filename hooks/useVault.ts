import { useCallback } from "react";
import { useAccount, useBalance, useWalletClient } from "wagmi";
import { publicClients } from "@/config/wagmi";
import { getContract } from "viem";
import { OperationType } from "@/types/staking";
import { getPortalContractByEvmChainID } from "@/config/stakingPortals";
import { EVMLSTToken, Token } from "@/types/tokens";
import { getPublicClient } from "@wagmi/core";
import { config } from "@/config/wagmi";
import { imuaChain } from "@/types/networks";
import { EVMNetwork, XRPL } from "@/types/networks";
import { usePortalContract } from "./usePortalContract";
import { useQuery } from "@tanstack/react-query";
import VaultABI from "@/abi/Vault.abi.json";

export function useEVMVault(token: EVMLSTToken) {
  const { contract, publicClient } = usePortalContract(
    token.network,
  );

  // Optimized vault address caching - permanent once fetched
  const { data: vaultAddress } = useQuery({
    queryKey: ["vaultAddress", token.network.evmChainID, token.address],
    queryFn: async (): Promise<`0x${string}`> => {
      if (!contract) throw new Error("Invalid Contract");
      const vaultAddress = await contract.read.tokenToVault([token.address]);
      return vaultAddress as `0x${string}`;
    },
    enabled: !!token && !!contract,
    staleTime: Infinity, // ✅ Never consider data stale - vault addresses are permanent
    gcTime: Infinity, // ✅ Never garbage collect - keep in memory permanently
    refetchOnMount: false, // ✅ Don't refetch on mount if already cached
    refetchOnWindowFocus: false, // ✅ Don't refetch on focus if already cached
    refetchOnReconnect: false, // ✅ Don't refetch on reconnect if already cached
  });

  const vault = vaultAddress && publicClient ? getContract({
    address: vaultAddress as `0x${string}`,
    abi: VaultABI,
    client: {
      public: publicClient,
    },
  }) : undefined;

  return {
    vaultAddress,
    vault,
  };
}
