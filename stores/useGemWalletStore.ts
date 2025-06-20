// stores/useGemWalletStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getAddress,
  getNetwork,
  sendPayment,
  isInstalled,
} from "@gemwallet/api";
import { GemWalletNetwork, GemWalletResponse } from "@/types/staking";

interface GemWalletState {
  // Existing wallet properties
  isWalletConnected: boolean;
  userAddress: string | undefined;
  walletNetwork: GemWalletNetwork | undefined;
  isLoading: boolean;
  installed: boolean;
  sessionExpiresAt: number | null;
  manuallyDisconnected: boolean;

  // New binding properties
  boundImuaAddress: `0x${string}` | null;
  isCheckingBinding: boolean;
  bindingError: string | null;

  // Existing wallet actions
  checkInstallation: () => Promise<void>;
  connect: () => Promise<GemWalletResponse>;
  disconnect: () => Promise<GemWalletResponse>;
  sendTransaction: (transaction: any) => Promise<GemWalletResponse>;

  // New binding actions
  setBoundAddress: (address: `0x${string}` | null) => void;
  setBindingStatus: (isChecking: boolean, error?: string | null) => void;
}

export const useGemWalletStore = create<GemWalletState>()(
  persist(
    (set, get) => ({
      // Existing wallet state
      isWalletConnected: false,
      userAddress: undefined,
      walletNetwork: undefined,
      isLoading: false,
      installed: false,
      sessionExpiresAt: null,
      manuallyDisconnected: false,
      // New binding state
      boundImuaAddress: null,
      isCheckingBinding: false,
      bindingError: null,

      // Existing wallet actions
      checkInstallation: async () => {
        try {
          const installed = await isInstalled();
          set({ installed: installed.result.isInstalled });
        } catch (error) {
          console.error("Error checking GemWallet installation:", error);
          set({ installed: false });
        }
      },

      connect: async () => {
        const { installed } = get();
        if (!installed) {
          return { success: false, error: "GemWallet is not installed" };
        }

        set({ isLoading: true });

        try {
          // Get user address from GemWallet
          const addressResponse = await getAddress();
          const address = addressResponse.result?.address;

          if (!address) {
            return {
              success: false,
              error: "Failed to get address",
            };
          }

          // Get network information
          const networkResponse = await getNetwork();
          const network = networkResponse.result;

          // Set expiration 24 hours from now
          const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

          // Update state
          set({
            isWalletConnected: true,
            userAddress: address,
            walletNetwork: network,
            isLoading: false,
            sessionExpiresAt: expiresAt,
            manuallyDisconnected: false,
          });

          return {
            success: true,
            xrpAddress: address,
            data: network,
          };
        } catch (error) {
          console.error("Error connecting to GemWallet:", error);
          set({ isLoading: false });
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Unknown error connecting to GemWallet",
          };
        }
      },

      disconnect: async () => {
        try {
          set({
            isWalletConnected: false,
            userAddress: undefined,
            walletNetwork: undefined,
            // Clear binding information on disconnect
            boundImuaAddress: null,
            bindingError: null,
            manuallyDisconnected: true,
          });

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
      },

      sendTransaction: async (transaction: any) => {
        const { installed, isWalletConnected, userAddress } = get();

        if (!installed || !isWalletConnected) {
          return { success: false, error: "GemWallet not connected" };
        }

        try {
          // For Payment transactions
          if (transaction.transactionType === "Payment") {
            const payment = {
              amount: transaction.amount,
              destination: transaction.destination,
              destinationTag: transaction.destinationTag,
              memos: transaction.memos,
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
              xrpAddress: userAddress,
              data: { hash },
            };
          } else {
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

      // New binding actions
      setBoundAddress: (address) => {
        set({ boundImuaAddress: address });
      },

      setBindingStatus: (isChecking, error = null) => {
        set({
          isCheckingBinding: isChecking,
          bindingError: error,
        });
      },
    }),
    {
      name: "gemwallet-storage", // localStorage key
      partialize: (state) => ({
        // Persist existing wallet data
        isWalletConnected: state.isWalletConnected,
        userAddress: state.userAddress,
        walletNetwork: state.walletNetwork,
        // Also persist the bound address
        boundImuaAddress: state.boundImuaAddress,
        manuallyDisconnected: state.manuallyDisconnected,
      }),
    },
  ),
);
