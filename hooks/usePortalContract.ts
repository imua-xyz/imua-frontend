import { useWalletClient } from "wagmi";
import { publicClients } from "@/config/wagmi";
import { getContract } from "viem";
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

  // Create contract with public client only (for read operations)
  const readonlyContract = publicClient
    ? getContract({
        address: network.portalContract.address as `0x${string}`,
        abi: network.portalContract.abi,
        client: publicClient,
      })
    : undefined;

  // Create contract with both clients (for write operations)
  const writeableContract =
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
    writeableContract, // Full contract for write operations
    readonlyContract, // Public-only contract for read operations
    publicClient,
    walletClient,
  };
}
