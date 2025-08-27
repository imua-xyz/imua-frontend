// stores/bindingClient.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { XRP_CHAIN_ID } from "@/config/xrp";
import { useGemWalletStore } from "./gemWalletClient";
import { useBootstrapStatus } from "@/hooks/useBootstrapStatus";

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
    isBootstrapPhase?: boolean,
  ): Promise<`0x${string}` | null> => {
    if (!xrpAddress) return null;

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
      // Determine if we're in bootstrap phase
      const isBootstrap = isBootstrapPhase ?? !utxoGateway;

      if (isBootstrap) {
        // During bootstrap phase, we can't query UTXOGateway contract
        // TODO: Replace with indexer service call when available
        // For now, return null (no bound address exists yet - user hasn't made first deposit)
        console.log(
          "Bootstrap phase: No bound address exists yet - any EVM wallet can be used for first deposit",
        );

        store.setState((state) => ({
          boundAddresses: {
            ...state.boundAddresses,
            [xrpAddress]: null,
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

        return null;
      }

      // Post-bootstrap phase: query UTXOGateway contract
      if (!utxoGateway) {
        throw new Error("UTXOGateway contract not available");
      }

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
    // Don't start if already polling
    if (bindingPollInterval) return;

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
        // During bootstrap phase, we can't query bindings, so skip polling
        if (!utxoGateway) {
          console.log("Bootstrap phase: Skipping binding check in polling");
          return;
        }
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
        checkBinding: async (
          xrpAddress: string,
          isBootstrapPhase?: boolean,
        ) => {
          return await checkBinding(xrpAddress, isBootstrapPhase);
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
    } else {
      // Wallet connected, start polling (will handle bootstrap phase internally)
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
  checkBinding: (
    xrpAddress: string,
    isBootstrapPhase?: boolean,
  ) => Promise<`0x${string}` | null>;
  setBinding: (xrpAddress: string, evmAddress: `0x${string}` | null) => void;
  clearBinding: (xrpAddress: string) => void;
  clearAllBindings: () => void;
}
