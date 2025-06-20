// stores/useWalletStore.ts (optimized)
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Token } from "@/types/tokens";
import { useAccount } from "wagmi";
import { useGemWallet } from "@/hooks/useGemWallet";
import { useEffect } from "react";

// Coordination happens in the hook
export function useWallet(token: Token ) {
  // Get EVM wallet state from wagmi
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  
  // Get XRP wallet state from gem wallet store
  const gemWallet = useGemWallet();
  
  // Determine if wallets are properly paired
  const arePaired = Boolean(
    isEvmConnected && 
    gemWallet.isConnected && 
    gemWallet.boundImuaAddress && 
    evmAddress && 
    gemWallet.boundImuaAddress.toLowerCase() === evmAddress.toLowerCase()
  );
  
  // Check binding when wallets change
  useEffect(() => {
    if (gemWallet.isConnected && isEvmConnected && typeof gemWallet.checkBoundAddress === 'function') {
      gemWallet.checkBoundAddress();
    }
  }, [gemWallet.isConnected, isEvmConnected, gemWallet.checkBoundAddress]);
  
  // Return a combined object with all wallet state and actions
  return {
    // EVM wallet state
    isEvmConnected,
    evmAddress,
    
    // XRP wallet state directly from gemWallet
    isXrpConnected: gemWallet.isConnected,
    xrpAddress: gemWallet.userAddress,
    isXrpInstalled: gemWallet.installed,
    boundImuaAddress: gemWallet.boundImuaAddress,
    
    // Pairing status
    arePaired,
    
    // Wallet actions
    connectXrp: gemWallet.connect,
    disconnectXrp: gemWallet.disconnect,
  };
}