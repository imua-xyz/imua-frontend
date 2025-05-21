// hooks/useXrplClient.ts
"use client";

import { useEffect } from "react";
import { useXrpClientStore } from "@/stores/useXrpClientStore";
import { useGemWalletStore } from "@/stores/useGemWalletStore";

/**
 * Hook for accessing the XRP Ledger client
 * Provides auto-connection based on the wallet's network
 */
export function useXrplClient() {
  // Get wallet and client states from stores
  const { isWalletConnected, walletNetwork } = useGemWalletStore();
  const {
    client,
    isConnected,
    isConnecting,
    error,
    currentNetwork,
    connect,
    disconnect,
    getAccountInfo,
    getTransactionStatus
  } = useXrpClientStore();

  // Auto-connect to XRPL when wallet is connected
  useEffect(() => {
    const autoConnect = async () => {
      // If wallet is connected and has network info
      if (isWalletConnected && walletNetwork) {
        // If client is not connected or connected to a different network
        if (!isConnected || (currentNetwork?.websocket !== walletNetwork.websocket)) {
          await connect(walletNetwork);
        }
      } else if (!isWalletConnected && isConnected) {
        // Disconnect client when wallet disconnects
        await disconnect();
      }
    };

    autoConnect();
  }, [isWalletConnected, walletNetwork, isConnected, currentNetwork, connect, disconnect]);

  // Return the client interface
  return {
    client,
    isConnected,
    isConnecting,
    error,
    network: currentNetwork,
    getAccountInfo,
    getTransactionStatus
  };
}