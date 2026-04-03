import {
  useBalance,
  useAccount,
  useDisconnect,
  useSwitchChain,
  useConnect,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { EVMLSTToken, EVMNSTToken } from "@/types/tokens";
import { EVMWalletConnector } from "@/types/wallet-connector";
import { createTestWalletConnector, isE2EMode } from "@/config/testWallet";

export function useEVMWalletConnector(
  token: EVMLSTToken | EVMNSTToken,
): EVMWalletConnector {
  const { address: userAddress, chainId, isConnected } = useAccount();
  const { data: balance } = useBalance({ address: userAddress });
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { connectAsync } = useConnect();

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
                // In E2E mode, bypass RainbowKit and connect directly with a
                // deterministic test wallet bound to Anvil.
                if (isE2EMode && connectAsync) {
                  const connector = createTestWalletConnector();
                  await connectAsync({
                    connector,
                    chainId: token.network.evmChainID,
                  });
                  return;
                }

                // In non-E2E environments, fall back to the normal RainbowKit flow.
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
