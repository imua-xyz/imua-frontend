import { useBalance } from "wagmi";
import { EVMLSTToken } from "@/types/tokens";
import { useAccount } from "wagmi";
import { EVMWalletConnector } from "@/types/wallet-connector";

export function useEVMWalletConnector(token: EVMLSTToken): EVMWalletConnector {
  const { address: userAddress, chainId, isConnected } = useAccount();
  const { data: balance } = useBalance({ address: userAddress });

  const isReady = isConnected && chainId === token.network.evmChainID;
  const issues = isReady
    ? undefined
    : {
        needsConnectToNative: true,
      };

  const nativeCurrencyBalance = {
    value: balance?.value || BigInt(0),
    decimals: balance?.decimals || 0,
    symbol: balance?.symbol || "",
  };

  return {
    isReady: isReady,
    isNativeWalletConnected: isConnected,
    nativeWalletAddress: userAddress as `0x${string}`,
    nativeCurrencyBalance: nativeCurrencyBalance,
    issues: issues,
  };
}
