import { useWalletClient } from "wagmi";
import { publicClients } from "@/config/wagmi";
import { erc20Abi, getContract } from "viem";
import { EVMLSTToken } from "@/types/tokens";
import { getPublicClient } from "@wagmi/core";
import { config } from "@/config/wagmi";

export function useERC20Token(token: EVMLSTToken) {
  const evmChainID = token.network.evmChainID;

  const { data: walletClient } = useWalletClient({ chainId: evmChainID });
  const publicClient = getPublicClient(config, {
    chainId: evmChainID as keyof typeof publicClients,
  });

  const contract =
    publicClient && walletClient
      ? getContract({
          address: token.address as `0x${string}`,
          abi: erc20Abi,
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
