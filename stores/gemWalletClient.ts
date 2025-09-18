// stores/gemWalletClient.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getAddress,
  getNetwork,
  sendPayment,
  isInstalled,
  on,
} from "@gemwallet/api";
import { GemWalletNetwork, GemWalletResponse } from "@/types/staking";

// Utility to handle document focus checks
const isDocumentFocused = () =>
  typeof document !== "undefined" && document.hasFocus();

// Create the client with event-driven updates
const createGemWalletClient = () => {
  // Session expiration check (only this needs polling)
  let sessionCheckInterval: NodeJS.Timeout | null = null;

  // Start session expiration check (only when connected)
  const startSessionCheck = () => {
    if (sessionCheckInterval) return;

    sessionCheckInterval = setInterval(() => {
      const state = store.getState();
      if (
        !state.isWalletConnected ||
        !state.sessionExpiresAt ||
        !isDocumentFocused()
      )
        return;

      if (Date.now() > state.sessionExpiresAt) {
        console.log("Session expired, disconnecting...");
        const disconnect = store.getState().disconnect;
        disconnect();
      }
    }, 60000);
  };

  // Stop session check
  const stopSessionCheck = () => {
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

            // Start session check when connected
            startSessionCheck();

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

            // Stop session check when disconnected
            stopSessionCheck();

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
      },
    ),
  );

  // Set up GemWallet event listeners (client-side only)
  const setupEventListeners = () => {
    // Only set up event listeners on the client side
    if (typeof window === "undefined") return;

    try {
      // Listen for login events
      on("login", (response) => {
        console.log("GemWallet login event:", response.loggedIn);
        if (response.loggedIn) {
          // Reconnect when user logs in
          const connect = store.getState().connect;
          connect();
        }
      });

      // Listen for logout events
      on("logout", (response) => {
        console.log("GemWallet logout event:", response.loggedIn);
        if (!response.loggedIn) {
          // Disconnect when user logs out
          const disconnect = store.getState().disconnect;
          disconnect();
        }
      });

      // Listen for network changes
      on("networkChanged", (response) => {
        console.log("GemWallet network changed:", response.network);
        // Reconnect to get updated network info
        const connect = store.getState().connect;
        connect();
      });

      // Listen for wallet changes
      on("walletChanged", (response) => {
        console.log("GemWallet wallet changed:", response.wallet.publicAddress);
        // Reconnect to get updated wallet info
        const connect = store.getState().connect;
        connect();
      });
    } catch (error) {
      console.warn("Failed to set up GemWallet event listeners:", error);
    }
  };

  // Initialize event listeners only on client side
  if (typeof window !== "undefined") {
    setupEventListeners();
  }

  // Initialize client-side logic only
  if (typeof window !== "undefined") {
    const initialState = store.getState();

    // Check installation status when the store is created
    setTimeout(() => {
      initialState.checkInstallation();
    }, 100);

    if (initialState.isWalletConnected && !initialState.manuallyDisconnected) {
      // Start session check when already connected
      startSessionCheck();

      // Auto-reconnect on initial load if there's a session
      // But only if the user didn't manually disconnect
      if (
        initialState.sessionExpiresAt &&
        initialState.sessionExpiresAt > Date.now()
      ) {
        // Small delay to ensure app is mounted
        setTimeout(() => {
          initialState.connect();
        }, 1000);
      }
    }
  }

  // Cleanup function
  const cleanup = () => {
    stopSessionCheck();
  };

  // Client-side initialization function
  const initialize = () => {
    if (typeof window === "undefined") return;

    const state = store.getState();

    // Check installation status
    state.checkInstallation();

    // Set up event listeners if not already done
    setupEventListeners();

    // Auto-reconnect if there's a valid session
    if (state.isWalletConnected && !state.manuallyDisconnected) {
      startSessionCheck();

      if (state.sessionExpiresAt && state.sessionExpiresAt > Date.now()) {
        setTimeout(() => {
          state.connect();
        }, 1000);
      }
    }
  };

  return {
    useStore: store,
    cleanup,
    initialize,
  };
};

// Create a single instance
export const gemWalletClient = createGemWalletClient();

// Export the store for component usage
export const useGemWalletStore = gemWalletClient.useStore;

// Export the initialize function for client-side setup
export const initializeGemWallet = gemWalletClient.initialize;

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
