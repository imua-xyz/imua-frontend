// hooks/useClientChainGateway.ts
import { useWalletClient } from "wagmi";
import { publicClients } from "@/config/wagmi";
import { getContract } from "viem";
import { getPublicClient } from "@wagmi/core";
import { config } from "@/config/wagmi";
import { EVMNetwork } from "@/types/networks";
import { useBootstrapStatus } from "./useBootstrapStatus";

export function useClientChainGateway(network: EVMNetwork) {
  const { data: walletClient } = useWalletClient({
    chainId: network.evmChainID,
  });
  const publicClient = getPublicClient(config, {
    chainId: network.evmChainID as keyof typeof publicClients,
  });
  const { bootstrapStatus } = useBootstrapStatus();

  // Only return ClientChainGateway contract when bootstrapped
  const gatewayContract =
    publicClient && bootstrapStatus?.isBootstrapped
      ? getContract({
          address: network.portalContract.address,
          abi: network.portalContract.abi, // ClientChainGateway ABI
          client: publicClient,
        })
      : undefined;

  const writeableGatewayContract =
    publicClient && walletClient && bootstrapStatus?.isBootstrapped
      ? getContract({
          address: network.portalContract.address,
          abi: network.portalContract.abi,
          client: { public: publicClient, wallet: walletClient },
        })
      : undefined;

  return {
    readonlyContract: gatewayContract,
    writeableContract: writeableGatewayContract,
    publicClient,
    walletClient,
    isAvailable: !!bootstrapStatus?.isBootstrapped,
  };
}
