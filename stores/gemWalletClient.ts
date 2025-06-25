// stores/gemWalletClient.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getAddress,
  getNetwork,
  sendPayment,
  isInstalled,
} from "@gemwallet/api";
import { GemWalletNetwork, GemWalletResponse } from "@/types/staking";

// Utility to handle document focus checks
const isDocumentFocused = () => typeof document !== "undefined" && document.hasFocus();

// Create the client with background polling
const createGemWalletClient = () => {
  // Polling intervals
  let networkPollInterval: NodeJS.Timeout | null = null;
  let sessionCheckInterval: NodeJS.Timeout | null = null;
  
  // Start polling mechanisms
  const startPolling = () => {
    // Already polling, don't start again
    if (networkPollInterval) return;
    
    // Network polling
    networkPollInterval = setInterval(async () => {
      const state = store.getState();
      if (!state.isWalletConnected || !state.installed || !isDocumentFocused()) return;
      
      try {
        const networkResponse = await getNetwork();
        const currentNetwork = networkResponse.result;

        if (currentNetwork && state.walletNetwork) {
          const isChanged =
            currentNetwork.network !== state.walletNetwork.network ||
            currentNetwork.websocket !== state.walletNetwork.websocket ||
            currentNetwork.chain !== state.walletNetwork.chain;

          if (isChanged) {
            console.log("Network changed, reconnecting...");
            const connect = store.getState().connect;
            await connect();
          }
        }
      } catch (error) {
        console.error("Error checking network:", error);
      }
    }, 30000);
    
    // Session expiration check
    sessionCheckInterval = setInterval(() => {
      const state = store.getState();
      if (!state.isWalletConnected || !state.sessionExpiresAt || !isDocumentFocused()) return;
      
      if (Date.now() > state.sessionExpiresAt) {
        console.log("Session expired, disconnecting...");
        const disconnect = store.getState().disconnect;
        disconnect();
      }
    }, 60000);
  };
  
  // Stop all polling
  const stopPolling = () => {
    if (networkPollInterval) {
      clearInterval(networkPollInterval);
      networkPollInterval = null;
    }
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
      sessionCheckInterval = null;
    }
  };
  
  // Create the store
  const store = create<GemWalletState>()(
    persist(
      (set, get) => ({
        // State
        isWalletConnected: false,
        userAddress: undefined,
        walletNetwork: undefined,
        isLoading: false,
        installed: false,
        sessionExpiresAt: null,
        manuallyDisconnected: false,

        // Actions
        checkInstallation: async () => {
          try {
            const installed = await isInstalled();
            set({ installed: installed.result.isInstalled });
            return installed.result.isInstalled;
          } catch (error) {
            console.error("Error checking GemWallet installation:", error);
            set({ installed: false });
            return false;
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
              set({ isLoading: false });
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
            
            // Start polling when connected
            startPolling();

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
              manuallyDisconnected: true,
            });
            
            // Stop polling when disconnected
            stopPolling();

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
      }),
      {
        name: "gemwallet-storage", // localStorage key
        partialize: (state) => ({
          // Only persist these fields
          isWalletConnected: state.isWalletConnected,
          userAddress: state.userAddress,
          walletNetwork: state.walletNetwork,
          manuallyDisconnected: state.manuallyDisconnected,
          sessionExpiresAt: state.sessionExpiresAt,
        }),
      }
    )
  );

  // Check if already connected on initialization
  const initialState = store.getState();
  if (initialState.isWalletConnected && !initialState.manuallyDisconnected) {
    startPolling();
    
    // Auto-reconnect on initial load if there's a session
    // But only if the user didn't manually disconnect
    if (initialState.sessionExpiresAt && initialState.sessionExpiresAt > Date.now()) {
      // Small delay to ensure app is mounted
      setTimeout(() => {
        initialState.connect();
      }, 1000);
    }
  }
  
  // Cleanup function
  const cleanup = () => {
    stopPolling();
  };
  
  return {
    useStore: store,
    cleanup,
  };
};

// Create a single instance
export const gemWalletClient = createGemWalletClient();

// Export the store for component usage
export const useGemWalletStore = gemWalletClient.useStore;

// Export interface for type checking
interface GemWalletState {
  // State
  isWalletConnected: boolean;
  userAddress: string | undefined;
  walletNetwork: GemWalletNetwork | undefined;
  isLoading: boolean;
  installed: boolean;
  sessionExpiresAt: number | null;
  manuallyDisconnected: boolean;

  // Actions
  checkInstallation: () => Promise<boolean>;
  connect: () => Promise<GemWalletResponse>;
  disconnect: () => Promise<GemWalletResponse>;
  sendTransaction: (transaction: any) => Promise<GemWalletResponse>;
}