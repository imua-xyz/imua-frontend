// hooks/useGemWallet.ts
"use client";

import { useEffect, useCallback } from "react";
import { getNetwork } from "@gemwallet/api";
import { useGemWalletStore } from "@/stores/useGemWalletStore";
import { useUTXOGateway } from "@/hooks/useUTXOGateway"; // Assume this hook exists to access the contract
import { XRP_CHAIN_ID } from "@/config/xrp"; // Import your XRP chain ID constant

export function useGemWallet() {
  const {
    isWalletConnected,
    userAddress,
    walletNetwork,
    isLoading,
    installed,
    sessionExpiresAt,
    boundImuaAddress,
    isCheckingBinding,
    bindingError,
    checkInstallation,
    connect,
    disconnect,
    sendTransaction,
    setBoundAddress,
    setBindingStatus,
  } = useGemWalletStore();

  const { contract: utxoGateway } = useUTXOGateway();

  // Check bound address when connected and no bound address exists
  const checkBoundAddress = useCallback(async (): Promise<
    `0x${string}` | null
  > => {
    console.log("DEBUG: checkBoundAddress called");

    if (!userAddress || !utxoGateway || isCheckingBinding) {
      console.log("DEBUG: early return triggered");
      return null;
    }

    try {
      console.log("DEBUG: setting binding status to true");
      setBindingStatus(true);

      // Convert XRP address to bytes format
      const xrpAddressBytes =
        "0x" + Buffer.from(userAddress, "utf8").toString("hex");

      // Call the contract to get bound address
      const boundAddress = await utxoGateway.read.getImuachainAddress([
        XRP_CHAIN_ID,
        xrpAddressBytes,
      ]);

      console.log("DEBUG: bound address from contract", boundAddress);

      // Check if the returned address is not the zero address
      const isValidAddress =
        boundAddress &&
        boundAddress !== "0x0000000000000000000000000000000000000000";

      if (isValidAddress) {
        setBoundAddress(boundAddress as `0x${string}`);
      } else {
        setBoundAddress(null);
      }

      setBindingStatus(false);
      return boundAddress as `0x${string}` | null;
    } catch (error) {
      console.error("Error fetching bound Imuachain address:", error);
      setBindingStatus(
        false,
        error instanceof Error
          ? error.message
          : "Unknown error checking binding",
      );
      return null;
    }
  }, [
    userAddress,
    utxoGateway,
    isCheckingBinding,
    setBindingStatus,
    setBoundAddress,
  ]);

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

  // Check for bound address when wallet connects or changes
  useEffect(() => {
    console.log("DEBUG: useEffect for checking bound address called");
    console.log("DEBUG: isWalletConnected", isWalletConnected);
    console.log("DEBUG: userAddress", userAddress);
    console.log("DEBUG: utxoGateway", utxoGateway);
    console.log("DEBUG: boundImuaAddress", boundImuaAddress);
    // Only check if we have a wallet connection and no bound address
    if (isWalletConnected && userAddress && utxoGateway && !boundImuaAddress) {
      // Use an IIFE to properly await the async function
      (async () => {
        try {
          await checkBoundAddress();
        } catch (error) {
          console.error("Error checking bound address:", error);
        }
      })();
    }
  }, [
    isWalletConnected,
    userAddress,
    utxoGateway,
    boundImuaAddress,
    checkBoundAddress,
  ]);

  // Periodically poll for binding if wallet is connected but no binding exists
  useEffect(() => {
    if (
      !isWalletConnected ||
      !userAddress ||
      !utxoGateway ||
      boundImuaAddress
    ) {
      return; // Don't poll if not connected or already have a binding
    }

    let intervalId: NodeJS.Timeout;

    const checkForNewBinding = async () => {
      // Only check when document is focused and we're not already checking
      if (
        typeof document !== "undefined" &&
        document.hasFocus() &&
        !isCheckingBinding
      ) {
        const newBoundAddress = await checkBoundAddress();
        if (
          newBoundAddress &&
          newBoundAddress !== "0x0000000000000000000000000000000000000000"
        ) {
          clearInterval(intervalId);
        }
      }
    };

    // Poll every 30 seconds for binding updates
    intervalId = setInterval(checkForNewBinding, 30000);

    return () => clearInterval(intervalId);
  }, [
    isWalletConnected,
    userAddress,
    utxoGateway,
    boundImuaAddress,
    isCheckingBinding,
    checkBoundAddress,
  ]);

  // Check for session expiration
  useEffect(() => {
    if (!isWalletConnected || !sessionExpiresAt) return;

    const checkExpiration = () => {
      if (typeof document !== "undefined" && document.hasFocus()) {
        if (Date.now() > sessionExpiresAt) {
          console.log("Session expired, disconnecting...");
          disconnect();
        }
      }
    };

    checkExpiration();
    const intervalId = setInterval(checkExpiration, 60000);
    return () => clearInterval(intervalId);
  }, [isWalletConnected, sessionExpiresAt, disconnect]);

  // Poll for network changes when connected
  useEffect(() => {
    if (!isWalletConnected || !installed) return;

    const checkNetworkChanges = async () => {
      if (typeof document !== "undefined" && document.hasFocus()) {
        try {
          const networkResponse = await getNetwork();
          const currentNetwork = networkResponse.result;

          if (currentNetwork && walletNetwork) {
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

    checkNetworkChanges();
    const intervalId = setInterval(checkNetworkChanges, 10000);
    return () => clearInterval(intervalId);
  }, [isWalletConnected, installed, walletNetwork, connect]);

  return {
    installed,
    isConnected: isWalletConnected,
    userAddress,
    network: walletNetwork,
    isLoading,
    boundImuaAddress,
    isCheckingBinding,
    bindingError,
    connect,
    disconnect,
    sendTransaction,
    checkBoundAddress,
  };
}
