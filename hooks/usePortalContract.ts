import { useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { publicClients } from "@/config/wagmi";
import { getContract } from "viem";
import { OperationType } from "@/types/staking";
import { getPortalContractByEvmChainID } from "@/config/stakingPortals";
import { EVMLSTToken, Token } from "@/types/tokens";
import { getPublicClient } from "@wagmi/core";
import { config } from "@/config/wagmi";
import { imuaChain } from "@/types/networks";
import { EVMNetwork, XRPL } from "@/types/networks";

export function usePortalContract(network: EVMNetwork | XRPL) {
  const evmChainID = (network as EVMNetwork).evmChainID || imuaChain.evmChainID;

  const { data: walletClient } = useWalletClient({ chainId: evmChainID });
  const publicClient = getPublicClient(config, {
    chainId: evmChainID as keyof typeof publicClients,
  });

  const contract =
    publicClient && walletClient
      ? getContract({
          address: network.portalContract.address as `0x${string}`,
          abi: network.portalContract.abi,
          client: {
            public: publicClient,
            wallet: walletClient,
          },
        })
      : undefined;

  return {
    contract,
    publicClient,
    walletClient,
  };
}
