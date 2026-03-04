// hooks/useBootstrap.ts
import { useWalletClient } from "wagmi";
import { publicClients } from "@/config/wagmi";
import { getContract } from "viem";
import { getPublicClient } from "@wagmi/core";
import { config } from "@/config/wagmi";
import { EVMNetwork } from "@/types/networks";
import { useBootstrapStatus } from "./useBootstrapStatus";

export function useBootstrap(network: EVMNetwork) {
  const { data: walletClient } = useWalletClient({
    chainId: network.evmChainID,
  });
  const publicClient = getPublicClient(config, {
    chainId: network.evmChainID as keyof typeof publicClients,
  });
  const { bootstrapStatus } = useBootstrapStatus();

  // Only return Bootstrap contract when NOT bootstrapped
  const bootstrapContract =
    publicClient &&
    network.portalContract.bootstrapABI &&
    !bootstrapStatus?.isBootstrapped
      ? getContract({
          address: network.portalContract.address,
          abi: network.portalContract.bootstrapABI,
          client: publicClient,
        })
      : undefined;

  const writeableBootstrapContract =
    publicClient &&
    walletClient &&
    network.portalContract.bootstrapABI &&
    !bootstrapStatus?.isBootstrapped
      ? getContract({
          address: network.portalContract.address,
          abi: network.portalContract.bootstrapABI,
          client: { public: publicClient, wallet: walletClient },
        })
      : undefined;

  return {
    readonlyContract: bootstrapContract,
    writeableContract: writeableBootstrapContract,
    publicClient,
    walletClient,
    isAvailable: !bootstrapStatus?.isBootstrapped,
  };
}
