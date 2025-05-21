// hooks/useGemWallet.ts
"use client";

import { useEffect, useCallback } from "react";
import { getNetwork } from "@gemwallet/api"; // Add getNetwork import
import { useGemWalletStore } from "@/stores/useGemWalletStore";

export function useGemWallet() {
  const {
    isWalletConnected,
    userAddress,
    walletNetwork,
    isLoading,
    installed,
    sessionExpiresAt,
    checkInstallation,
    connect,
    disconnect,
    sendTransaction,
  } = useGemWalletStore();

  // Auto check installation on mount
  useEffect(() => {
    checkInstallation();
  }, [checkInstallation]);

  // Auto-reconnect if session exists on mount
  useEffect(() => {
    const attemptReconnect = async () => {
      if (!installed || isWalletConnected) return;
      await connect();
    };

    attemptReconnect();
  }, [installed, isWalletConnected, connect]);

  // Check for session expiration
  useEffect(() => {
    if (!isWalletConnected || !sessionExpiresAt) return;

    const checkExpiration = () => {
      // Only check when document is focused
      if (typeof document !== "undefined" && document.hasFocus()) {
        if (Date.now() > sessionExpiresAt) {
          console.log("Session expired, disconnecting...");
          disconnect();
        }
      }
    };

    // Check immediately
    checkExpiration();

    // Also check periodically
    const intervalId = setInterval(checkExpiration, 60000); // every minute

    return () => clearInterval(intervalId);
  }, [isWalletConnected, sessionExpiresAt, disconnect]);

  // Poll for network changes when connected
  useEffect(() => {
    if (!isWalletConnected || !installed) return;

    // Check for network changes
    const checkNetworkChanges = async () => {
      // Only run when the window is focused
      if (typeof document !== "undefined" && document.hasFocus()) {
        try {
          const networkResponse = await getNetwork();
          const currentNetwork = networkResponse.result;

          // Only update state if there's an actual network change
          if (currentNetwork && walletNetwork) {
            // Deep equality check instead of just checking network name
            const isChanged =
              currentNetwork.network !== walletNetwork.network ||
              currentNetwork.websocket !== walletNetwork.websocket ||
              currentNetwork.chain !== walletNetwork.chain;

            if (isChanged) {
              console.log("Network genuinely changed, reconnecting...");
              await connect();
            }
          }
        } catch (error) {
          console.error("Error checking network:", error);
        }
      }
    };

    // Check immediately on mount
    checkNetworkChanges();

    // Then poll periodically
    const intervalId = setInterval(checkNetworkChanges, 10000); // every 10 seconds

    return () => clearInterval(intervalId);
  }, [isWalletConnected, installed, walletNetwork, connect]);

  return {
    installed,
    isConnected: isWalletConnected,
    userAddress,
    network: walletNetwork,
    isLoading,
    connect,
    disconnect,
    sendTransaction,
  };
}
