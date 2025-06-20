// hooks/useWalletConnectionStatus.ts
import { useAccount } from "wagmi";
import { Token } from "@/types/tokens";
import { useGemWalletStore } from "@/stores/gemWalletClient";

interface WalletConnectionStatus {
  isReady: boolean;
  issues: {
    needsImuaConnection: boolean;
    needsNetworkSwitch: boolean;
    needsCorrectAddress: boolean;
    needsNativeWallet: boolean;
  };
  boundAddress?: string;
  currentNetwork?: number;
  targetNetwork?: number;
}

export function useWalletConnectionStatus(token: Token | null): WalletConnectionStatus {
  const { address, isConnected: isEVMConnected } = useAccount();
  const isGemWalletConnected = useGemWalletStore((state) => state.isWalletConnected);
  const gemWalletNetwork = useGemWalletStore((state) => state.network);
  const boundImuaAddress = useGemWalletStore((state) => state.boundImuaAddress);
  
  if (!token) {
    return {
      isReady: false,
      issues: {
        needsEVMConnection: false,
        needsNetworkSwitch: false,
        needsCorrectAddress: false,
        needsNativeWallet: false,
      }
    };
  }
  
  const requirements = token.walletRequirements;
  
  // Check EVM wallet connection if required
  const needsEVMConnection = requirements.requiresEVM && !isEVMConnected;
  
  // Check if network matches required network
  const needsNetworkSwitch = requirements.requiresEVM && 
    isEVMConnected && 
    chain?.id !== requirements.targetNetwork.evmChainID;
  
  // Check address binding if required
  const needsCorrectAddress = requirements.requiresAddressBinding && 
    isEVMConnected && 
    boundImuaAddress && 
    address?.toLowerCase() !== boundImuaAddress.toLowerCase();
  
  // Check native wallet connection if required
  const needsNativeWallet = !!requirements.requiresNativeWallet && 
    !isGemWalletConnected;
  
  // Check if native wallet is on correct network
  const isNativeWalletOnCorrectNetwork = !requirements.requiresNativeWallet || 
    (gemWalletNetwork?.network === "Testnet"); // Adjust based on your requirements
  
  // Overall ready state
  const isReady = !(
    needsEVMConnection || 
    needsNetworkSwitch || 
    needsCorrectAddress || 
    needsNativeWallet || 
    !isNativeWalletOnCorrectNetwork
  );
  
  return {
    isReady,
    issues: {
      needsEVMConnection,
      needsNetworkSwitch,
      needsCorrectAddress,
      needsNativeWallet,
    },
    boundAddress: boundImuaAddress,
    currentNetwork: chain?.id,
    targetNetwork: requirements.targetNetwork.evmChainID,
  };
}