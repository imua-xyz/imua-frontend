import { useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { publicClients } from "@/config/wagmi";
import { getContract } from "viem";
import { OperationType } from "@/types/staking";
import { getPortalContractByEvmChainID } from "@/config/stakingPortals";

export function useClientChainGateway() {
  const { address: userAddress, chainId, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = publicClients[chainId as keyof typeof publicClients];
  const portalContract = getPortalContractByEvmChainID(chainId as number);

  const contractAddress =
    portalContract && portalContract.name === "ClientChainGateway"
      ? portalContract.address
      : null;
  const contractAbi =
    portalContract && portalContract.name === "ClientChainGateway"
      ? portalContract.abi
      : null;

  const contract =
    contractAddress && contractAbi && publicClient && walletClient
      ? getContract({
          address: contractAddress as `0x${string}`,
          abi: contractAbi,
          client: {
            public: publicClient,
            wallet: walletClient,
          },
        })
      : null;

  const getQuote = useCallback(
    async (operation: OperationType): Promise<bigint> => {
      if (!contract) return BigInt(0);

      const lengths = {
        asset: 97,
        delegation: 138,
        associate: 74,
        dissociate: 33,
      };

      const message = "0x" + "00".repeat(lengths[operation]);
      const fee = await contract.read.quote([message]);
      return fee as bigint;
    },
    [contract],
  );

  const getVaultAddress = useCallback(
    async (token?: `0x${string}`): Promise<`0x${string}`> => {
      if (!contract || !token) throw new Error("Contract or token not found");
      const vaultAddress = await contract.read.tokenToVault([token]);
      return vaultAddress as `0x${string}`;
    },
    [contract],
  );

  return {
    contract,
    publicClient,
    walletClient,
    contractAddress,
    userAddress,
    chainId,
    isConnected,
    getQuote,
    getVaultAddress,
  };
}
