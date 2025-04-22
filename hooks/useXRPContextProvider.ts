import { TokenInfo, XRPStakingContext } from "@/types/staking";
import { XRP_TOKEN_ADDRESS } from "@/config/xrp";
import { useGemWallet } from "./useGemWallet";
import { useAccount } from "wagmi";

export function useXRPContextProvider(): XRPStakingContext {
  const {
    isConnected: isGemWalletConnected,
    userAddress,
    network,
    installed,
    connect,
    sendTransaction,
  } = useGemWallet();
  const { isConnected: isWagmiConnected } = useAccount();
  const whitelistedTokens: TokenInfo[] = [
    {
      address: XRP_TOKEN_ADDRESS,
      name: "XRP",
      symbol: "XRP",
      decimals: 6,
    },
  ];

  console.log("isGemWalletConnected", isGemWalletConnected);
  console.log("isWagmiConnected", isWagmiConnected);

  return {
    whitelistedTokens,
    isConnected: isGemWalletConnected && isWagmiConnected,
    isLoading: false,
    isStakingEnabled: true,
    userAddress: userAddress,
    network: network,
    connect: connect,
    sendTransaction: sendTransaction,
    isInstalled: installed,
  };
}
