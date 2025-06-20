// stores/bindingClient.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { XRP_CHAIN_ID } from "@/config/xrp";
import { useGemWalletStore } from "./gemWalletClient";

// Utility to handle document focus checks
const isDocumentFocused = () =>
  typeof document !== "undefined" && document.hasFocus();

// Create binding client with background polling
const createBindingClient = () => {
  // Polling intervals
  let bindingPollInterval: NodeJS.Timeout | null = null;

  // Contract reference
  let utxoGateway: any = null;

  // Set contract reference
  const setContract = (contract: any) => {
    utxoGateway = contract;

    // Check bindings for connected wallets
    const gemWalletState = useGemWalletStore.getState();
    if (gemWalletState.isWalletConnected && gemWalletState.userAddress) {
      checkBinding(gemWalletState.userAddress);
    }

    // Start polling if needed
    startPolling();
  };

  // Check binding for a specific address
  const checkBinding = async (
    xrpAddress: string,
  ): Promise<`0x${string}` | null> => {
    if (!xrpAddress || !utxoGateway) return null;

    const state = store.getState();
    const currentCheckingState = state.isCheckingBinding[xrpAddress] || false;

    if (currentCheckingState) return null;

    // Update checking state
    store.setState({
      isCheckingBinding: {
        ...state.isCheckingBinding,
        [xrpAddress]: true,
      },
    });

    try {
      // Convert XRP address to bytes format
      const xrpAddressBytes =
        "0x" + Buffer.from(xrpAddress, "utf8").toString("hex");

      // Call the contract to get bound address
      const boundAddress = await utxoGateway.read.getImuachainAddress([
        XRP_CHAIN_ID,
        xrpAddressBytes,
      ]);

      // Check if the returned address is not the zero address
      const isValidAddress =
        boundAddress &&
        boundAddress !== "0x0000000000000000000000000000000000000000";

      // Update state
      store.setState((state) => ({
        boundAddresses: {
          ...state.boundAddresses,
          [xrpAddress]: isValidAddress ? (boundAddress as `0x${string}`) : null,
        },
        isCheckingBinding: {
          ...state.isCheckingBinding,
          [xrpAddress]: false,
        },
        bindingErrors: {
          ...state.bindingErrors,
          [xrpAddress]: null,
        },
      }));

      return isValidAddress ? (boundAddress as `0x${string}`) : null;
    } catch (error) {
      console.error("Error fetching bound address:", error);

      // Update error state
      store.setState((state) => ({
        isCheckingBinding: {
          ...state.isCheckingBinding,
          [xrpAddress]: false,
        },
        bindingErrors: {
          ...state.bindingErrors,
          [xrpAddress]:
            error instanceof Error ? error.message : "Unknown error",
        },
      }));

      return null;
    }
  };

  // Start polling for bindings
  const startPolling = () => {
    // Don't start if already polling or no contract
    if (bindingPollInterval || !utxoGateway) return;

    // Start binding poll
    bindingPollInterval = setInterval(() => {
      const gemWalletState = useGemWalletStore.getState();
      const bindingState = store.getState();

      // Only check if wallet is connected and document is focused
      if (
        !gemWalletState.isWalletConnected ||
        !gemWalletState.userAddress ||
        !isDocumentFocused()
      )
        return;

      const xrpAddress = gemWalletState.userAddress;
      const boundAddress = bindingState.boundAddresses[xrpAddress];
      const isChecking = bindingState.isCheckingBinding[xrpAddress];

      // Only check if we don't have a binding yet and not already checking
      if (boundAddress === undefined && !isChecking) {
        checkBinding(xrpAddress);
      }
    }, 30000);
  };

  // Stop polling
  const stopPolling = () => {
    if (bindingPollInterval) {
      clearInterval(bindingPollInterval);
      bindingPollInterval = null;
    }
  };

  // Create the store
  const store = create<BindingState>()(
    persist(
      (set, get) => ({
        // State
        boundAddresses: {},
        isCheckingBinding: {},
        bindingErrors: {},

        // Actions
        checkBinding: async (xrpAddress: string) => {
          return await checkBinding(xrpAddress);
        },

        setBinding: (xrpAddress: string, evmAddress: `0x${string}` | null) => {
          set((state) => ({
            boundAddresses: {
              ...state.boundAddresses,
              [xrpAddress]: evmAddress,
            },
          }));
        },

        clearBinding: (xrpAddress: string) => {
          set((state) => {
            // Use object destructuring to remove this address from the state
            const { [xrpAddress]: _, ...remainingAddresses } =
              state.boundAddresses;
            const { [xrpAddress]: __, ...remainingChecking } =
              state.isCheckingBinding;
            const { [xrpAddress]: ___, ...remainingErrors } =
              state.bindingErrors;

            return {
              boundAddresses: remainingAddresses,
              isCheckingBinding: remainingChecking,
              bindingErrors: remainingErrors,
            };
          });
        },

        clearAllBindings: () => {
          set({
            boundAddresses: {},
            isCheckingBinding: {},
            bindingErrors: {},
          });
        },
      }),
      {
        name: "binding-storage",
        partialize: (state) => ({
          // Only persist bound addresses
          boundAddresses: state.boundAddresses,
        }),
      },
    ),
  );

  // Subscribe to GemWallet state changes
  useGemWalletStore.subscribe((state) => {
    if (!state.isWalletConnected) {
      // Wallet disconnected, stop polling
      stopPolling();
    } else if (utxoGateway) {
      // Wallet connected and we have a contract, start polling
      startPolling();
    }
  });

  // Cleanup function
  const cleanup = () => {
    stopPolling();
  };

  return {
    useStore: store,
    setContract,
    checkBinding,
    cleanup,
  };
};

// Create a single instance
export const bindingClient = createBindingClient();

// Export the store for component usage
export const useBindingStore = bindingClient.useStore;

// Export interface for type checking
interface BindingState {
  // State
  boundAddresses: Record<string, `0x${string}` | null>;
  isCheckingBinding: Record<string, boolean>;
  bindingErrors: Record<string, string | null>;

  // Actions
  checkBinding: (xrpAddress: string) => Promise<`0x${string}` | null>;
  setBinding: (xrpAddress: string, evmAddress: `0x${string}` | null) => void;
  clearBinding: (xrpAddress: string) => void;
  clearAllBindings: () => void;
}
