import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Token, getNetworkByChainId } from "@/types/tokens";
import { AllWalletsState } from "@/types/wallet-state";

// Global state for contract
let utxoGateway: any = null;

// Set contract reference
const setContract = (contract: any) => {
  utxoGateway = contract;
};

export const useAllWalletsStore = create<AllWalletsState>()(
  persist(
    (set, get) => ({
      // State
      wallets: {},
      provisionalBindings: {},

      // Three-tier update functions
      setWallet: (customChainId, state) =>
        set((prev) => ({
          wallets: {
            ...prev.wallets,
            [customChainId]: {
              ...prev.wallets[customChainId],
              ...state,
            },
          },
        })),

      setBasicWallet: (customChainId, basicState) => {
        set((state) => ({
          wallets: {
            ...state.wallets,
            [customChainId]: {
              ...state.wallets[customChainId],
              isConnected: state.wallets[customChainId]?.isConnected || false,
              address: state.wallets[customChainId]?.address,
              boundImuaAddress: state.wallets[customChainId]?.boundImuaAddress,
              isCheckingBinding:
                state.wallets[customChainId]?.isCheckingBinding || false,
              bindingError: state.wallets[customChainId]?.bindingError || null,
              ...basicState,
            },
          },
        }));
      },

      setBinding: (customChainId, bindingState) => {
        set((state) => ({
          wallets: {
            ...state.wallets,
            [customChainId]: {
              ...state.wallets[customChainId],
              isConnected: state.wallets[customChainId]?.isConnected || false,
              address: state.wallets[customChainId]?.address,
              boundImuaAddress: state.wallets[customChainId]?.boundImuaAddress,
              isCheckingBinding:
                state.wallets[customChainId]?.isCheckingBinding || false,
              bindingError: state.wallets[customChainId]?.bindingError || null,
              ...bindingState,
            },
          },
        }));
      },

      // Provisional binding operations
      setProvisionalBinding: (customChainId, sourceAddress, targetAddress) => {
        const key = `${customChainId}-${sourceAddress.toLowerCase()}`;
        const network = getNetworkByChainId(customChainId);
        const chainType = network?.chainName === "XRPL" ? "XRP" : "BTC";

        set((state) => ({
          provisionalBindings: {
            ...state.provisionalBindings,
            [key]: {
              sourceAddress: sourceAddress.toLowerCase(),
              targetAddress: targetAddress.toLowerCase(),
              chainType,
              timestamp: Date.now(),
            },
          },
        }));
      },

      removeProvisionalBinding: (customChainId, sourceAddress) => {
        const key = `${customChainId}-${sourceAddress.toLowerCase()}`;
        set((state) => {
          const newBindings = { ...state.provisionalBindings };
          delete newBindings[key];
          return { provisionalBindings: newBindings };
        });
      },

      clearAllProvisionalBindings: () => {
        set({ provisionalBindings: {} });
      },

      // Utility operations
      disconnectWallet: (customChainId) =>
        set((prev) => {
          const newWallets = { ...prev.wallets };
          delete newWallets[customChainId];
          return { wallets: newWallets };
        }),

      clearBinding: (customChainId) => {
        set((state) => ({
          wallets: {
            ...state.wallets,
            [customChainId]: {
              ...state.wallets[customChainId],
              isConnected: state.wallets[customChainId]?.isConnected || false,
              address: state.wallets[customChainId]?.address,
              boundImuaAddress: undefined,
              isCheckingBinding: false,
              bindingError: null,
            },
          },
        }));
      },

      clearAllBindings: () => {
        set((state) => {
          const newWallets = { ...state.wallets };
          Object.keys(newWallets).forEach((chainId) => {
            const wallet = newWallets[Number(chainId)];
            if (wallet) {
              newWallets[Number(chainId)] = {
                ...wallet,
                boundImuaAddress: undefined,
                isCheckingBinding: false,
                bindingError: null,
              };
            }
          });
          return { wallets: newWallets };
        });
      },

      // Contract management
      setContract: setContract,
    }),
    {
      name: "all-wallets-storage",
      partialize: (state) => ({
        // Persist wallet states and provisional bindings
        wallets: state.wallets,
        provisionalBindings: state.provisionalBindings,
      }),
    },
  ),
);

export function getQueryStakerAddress(token: Token): {
  queryAddress: string | undefined;
  stakerAddress: string | undefined;
} {
  const wallets = useAllWalletsStore.getState().wallets;
  const wallet = wallets[token.network.customChainIdByImua];
  let stakerAddress: string | undefined = undefined;
  let queryAddress: string | undefined = undefined;

  if (wallet) {
    if (token.network.connector.requireExtraConnectToImua) {
      if (wallet.boundImuaAddress) {
        stakerAddress = wallet.address;
        queryAddress = wallet.boundImuaAddress;
      } else if (wallet.address) {
        // User has not bound an imua address yet, treat as no delegations
        stakerAddress = wallet.address;
        queryAddress = undefined;
      } else {
        stakerAddress = undefined;
        queryAddress = undefined;
      }
    } else {
      stakerAddress = wallet.address;
      queryAddress = wallet.address;
    }
  }

  return { queryAddress, stakerAddress };
}
