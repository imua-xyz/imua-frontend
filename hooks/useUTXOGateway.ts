// hooks/useUTXOGateway.ts
import { useWalletClient } from "wagmi";
import { publicClients } from "@/config/wagmi";
import { getContract } from "viem";
import { getPublicClient } from "@wagmi/core";
import { config } from "@/config/wagmi";
import {
  XRPL,
  BitcoinNetwork,
  BitcoinTestnetNetwork,
  imuaChain,
} from "@/types/networks";
import { useBootstrapStatus } from "./useBootstrapStatus";

export function useUTXOGateway(
  network: XRPL | BitcoinNetwork | BitcoinTestnetNetwork,
) {
  // For XRPL, we use the imuaChain network for contract interactions
  const { data: walletClient } = useWalletClient({
    chainId: imuaChain.evmChainID,
  });
  const publicClient = getPublicClient(config, {
    chainId: imuaChain.evmChainID as keyof typeof publicClients,
  });
  const { bootstrapStatus } = useBootstrapStatus();

  // UTXOGateway contract is only available after Imuachain is bootstrapped
  const utxoGatewayContract =
    publicClient && bootstrapStatus?.isBootstrapped
      ? getContract({
          address: network.portalContract.address,
          abi: network.portalContract.abi,
          client: publicClient,
        })
      : undefined;

  const writeableUtxoGatewayContract =
    publicClient && walletClient && bootstrapStatus?.isBootstrapped
      ? getContract({
          address: network.portalContract.address,
          abi: network.portalContract.abi,
          client: { public: publicClient, wallet: walletClient },
        })
      : undefined;

  return {
    readonlyContract: utxoGatewayContract,
    writeableContract: writeableUtxoGatewayContract,
    publicClient,
    walletClient,
    isAvailable: !!publicClient && !!bootstrapStatus?.isBootstrapped, // Only available after bootstrap
  };
}
