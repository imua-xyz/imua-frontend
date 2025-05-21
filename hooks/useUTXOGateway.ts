"use client";

import {
  useAccount,
  useChainId,
  useWalletClient,
  usePublicClient,
} from "wagmi";
import { getContract } from "viem";
import { getPortalContractByEvmChainID } from "@/config/stakingPortals";

/**
 * Hook for interacting with the UTXOGateway contract
 */
export function useUTXOGateway() {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Get contract address for current chain
  const portalContract = getPortalContractByEvmChainID(chainId as number);
  const contractAddress =
    portalContract && portalContract.name === "UTXOGateway"
      ? portalContract.address
      : null;
  const contractAbi =
    portalContract && portalContract.name === "UTXOGateway"
      ? portalContract.abi
      : null;
  const isUTXOGatewayAvailable = contractAddress ? true : false;

  // Create contract instance if we have the necessary dependencies
  const contract =
    contractAddress && contractAbi && walletClient && publicClient
      ? getContract({
          address: contractAddress,
          abi: contractAbi,
          client: { public: publicClient, wallet: walletClient },
        })
      : null;

  return {
    contract,
    publicClient,
    walletClient,
    contractAddress,
    userAddress,
    chainId,
    isUTXOGatewayAvailable,
  };
}
