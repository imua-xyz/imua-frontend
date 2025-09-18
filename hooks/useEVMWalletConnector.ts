import { useBalance, useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { EVMLSTToken } from "@/types/tokens";
import { EVMWalletConnector } from "@/types/wallet-connector";

export function useEVMWalletConnector(token: EVMLSTToken): EVMWalletConnector {
  const { address: userAddress, chainId, isConnected } = useAccount();
  const { data: balance } = useBalance({ address: userAddress });
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const isReadyForStaking = isConnected && chainId === token.network.evmChainID;

  const nativeWallet = {
    connected: isConnected,
    address: userAddress,
    balance: {
      value: balance?.value || BigInt(0),
      decimals: balance?.decimals || 0,
      symbol: balance?.symbol || "",
    },
  };

  const issues = isReadyForStaking
    ? undefined
    : {
        needsConnectNative: !isConnected
          ? {
              resolve: async () => {
                if (openConnectModal) {
                  openConnectModal();
                }
              },
              needsAction: true,
            }
          : undefined,
        needsSwitchNative:
          isConnected && chainId !== token.network.evmChainID
            ? {
                resolve: async () => {
                  if (switchChain) {
                    switchChain({ chainId: token.network.evmChainID });
                  }
                },
                needsAction: true,
              }
            : undefined,
      };

  return {
    isReadyForStaking,
    nativeWallet,
    issues,
    disconnectNative: async () => {
      if (disconnect) {
        disconnect();
      }
    },
  } as EVMWalletConnector;
}
