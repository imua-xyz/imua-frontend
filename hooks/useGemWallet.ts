"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAddress,
  getNetwork,
  sendPayment,
  isInstalled,
  Network,
} from "@gemwallet/api";
import { GemWalletNetwork, GemWalletResponse } from "@/types/staking";

/**
 * Hook for managing GemWallet connection and session
 */
export function useGemWallet() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | undefined>(undefined);
  const [walletNetwork, setWalletNetwork] = useState<
    GemWalletNetwork | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [installed, setInstalled] = useState(false);

  console.log("DEBUG: current walletconnection", isWalletConnected);

  // Check for existing session
  const checkSession = useCallback(async () => {
    if (!installed) return;

    try {
      // Check for existing session in localStorage
      const storedSession = localStorage.getItem("gemwallet-session");
      if (storedSession) {
        const session = JSON.parse(storedSession);
        if (session.userAddress && new Date(session.expiresAt) > new Date()) {
          // Verify the address is still available in GemWallet
          try {
            const currentAddress = await getAddress();
            if (currentAddress === session.userAddress) {
              return;
            }
          } catch (error) {
            // Error getting address, user may have disconnected
            console.log("Error verifying GemWallet address:", error);
          }
        }
        // Session expired or address changed
        localStorage.removeItem("gemwallet-session");
        setIsWalletConnected(false);
        setUserAddress(undefined);
        setWalletNetwork(undefined);
      }
    } catch (error) {
      console.error("Error checking GemWallet session:", error);
    }
  }, [installed]);

  // // Check if GemWallet is installed by checking window.gem object
  // useEffect(() => {
  //   const checkInstallation = async () => {
  //     try {
  //       const installed = await isInstalled();
  //       setInstalled(installed.result.isInstalled);
  //     } catch (error) {
  //       console.error('Error checking GemWallet installation:', error);
  //       setInstalled(false);
  //     }
  //   };

  //   checkInstallation();

  //   // Only set up polling if installed (no need to check window again)
  //   if (installed) {
  //     const intervalId = setInterval(checkSession, 30000); // every 30 seconds
  //     return () => clearInterval(intervalId);
  //   }
  // }, [installed, checkSession]);

  // // Auto-reconnect if session exists on mount
  // useEffect(() => {
  //   const attemptReconnect = async () => {
  //     // Only try to reconnect if wallet is installed
  //     if (!installed) return;

  //     try {
  //       const storedSession = localStorage.getItem('gemwallet-session');
  //       if (storedSession) {
  //         const session = JSON.parse(storedSession);
  //         if (session.userAddress && new Date(session.expiresAt) > new Date()) {
  //           // Verify silently - this shouldn't trigger wallet UI
  //           // but just check if the connection is still valid
  //           try {
  //             const currentAddress = await getAddress();
  //             if (currentAddress === session.userAddress) {
  //               // Session is valid, restore connection state
  //               setIsWalletConnected(true);
  //               setUserAddress(session.userAddress);
  //               setWalletNetwork(session.network);
  //             } else {
  //               // Address mismatch, clear invalid session
  //               localStorage.removeItem('gemwallet-session');
  //             }
  //           } catch (error) {
  //             // Error verifying, clear invalid session
  //             localStorage.removeItem('gemwallet-session');
  //             console.log('Failed to verify existing session:', error);
  //           }
  //         } else {
  //           // Session expired, clear it
  //           localStorage.removeItem('gemwallet-session');
  //         }
  //       }
  //     } catch (error) {
  //       console.error('Error during auto-reconnect:', error);
  //     }
  //   };

  //   attemptReconnect();
  // }, [installed]);

  // Check if GemWallet is installed by checking window.gem object
  useEffect(() => {
    const checkInstallation = async () => {
      try {
        const installed = await isInstalled();
        setInstalled(installed.result.isInstalled);
      } catch (error) {
        console.error("Error checking GemWallet installation:", error);
        setInstalled(false);
      }
    };

    checkInstallation();
  }, [installed]);

  // Connect to GemWallet
  const connect = useCallback(async (): Promise<GemWalletResponse> => {
    if (!installed)
      return { success: false, error: "GemWallet is not installed" };

    setIsLoading(true);

    try {
      // Get user address from GemWallet
      const addressResponse = await getAddress();
      const address = addressResponse.result?.address;

      console.log("DEBUG: xrp address", address);

      if (!address) {
        return {
          success: false,
          error: "Failed to get address",
        };
      }

      // Get network information and map to config
      const networkResponse = await getNetwork();
      const network = networkResponse.result;

      console.log("DEBUG: network", network);

      // Store session with network config
      const session = {
        userAddress: address,
        network,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem("gemwallet-session", JSON.stringify(session));

      console.log("DEBUG: session", session);

      setIsWalletConnected(true);
      setUserAddress(address);
      setWalletNetwork(network);

      console.log("DEBUG: after connect isconnected", isWalletConnected);
      console.log("DEBUG: after connect userAddress", userAddress);
      console.log("DEBUG: after connect walletNetwork", walletNetwork);

      return {
        success: true,
        xrpAddress: address,
        data: network,
      };
    } catch (error) {
      console.error("Error connecting to GemWallet:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error connecting to GemWallet",
      };
    } finally {
      setIsLoading(false);
    }
  }, [installed]);

  // Disconnect from GemWallet
  const disconnect = useCallback(async (): Promise<GemWalletResponse> => {
    try {
      // Remove the session from localStorage
      localStorage.removeItem("gemwallet-session");

      setIsWalletConnected(false);
      setUserAddress(undefined);
      setWalletNetwork(undefined);

      return { success: true };
    } catch (error) {
      console.error("Error disconnecting from GemWallet:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error disconnecting from GemWallet",
      };
    }
  }, []);

  // Send a payment via GemWallet
  const sendTransaction = useCallback(
    async (transaction: any): Promise<GemWalletResponse> => {
      if (!installed || !isWalletConnected) {
        return { success: false, error: "GemWallet not connected" };
      }

      try {
        // For Payment transactions
        if (transaction.TransactionType === "Payment") {
          const payment = {
            amount: transaction.Amount,
            destination: transaction.Destination,
            destinationTag: transaction.DestinationTag,
            memos: transaction.Memos,
          };

          const hash = await sendPayment(payment);

          if (hash === null) {
            return { success: false, error: "User refused the payment" };
          }

          if (!hash) {
            return { success: false, error: "Failed to send payment" };
          }

          return {
            success: true,
            xrpAddress: userAddress || undefined,
            data: {
              hash,
            },
          };
        } else {
          // For other transaction types, would need to use submitTransaction
          // This part would need to be implemented once GemWallet adds support for other transaction types
          return {
            success: false,
            error: "Only Payment transactions are supported at this time",
          };
        }
      } catch (error) {
        console.error("Error sending transaction via GemWallet:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error sending transaction",
        };
      }
    },
    [installed, isWalletConnected, userAddress],
  );

  // Return the hook interface
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
