import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Token } from "@/types/tokens";

// Basic wallet connection state
export interface BasicWalletState {
  isConnected: boolean;
  address?: string;
}

// Binding-specific state
export interface BindingState {
  boundImuaAddress?: string | null;
  isCheckingBinding?: boolean;
  bindingError?: string | null;
}

// Combined wallet state
export interface GenericWalletState extends BasicWalletState, BindingState {}

export interface AllWalletsState {
  wallets: Record<number, GenericWalletState | undefined>;

  // Three-tier update functions
  setWallet: (customChainId: number, state: GenericWalletState) => void;
  setBasicWallet: (
    customChainId: number,
    basicState: Partial<BasicWalletState>,
  ) => void;
  setBinding: (
    customChainId: number,
    bindingState: Partial<BindingState>,
  ) => void;

  // Utility operations
  disconnectWallet: (customChainId: number) => void;
  clearBinding: (customChainId: number) => void;
  clearAllBindings: () => void;

  // Contract management
  setContract: (contract: any) => void;
}

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
        // Only persist wallet states
        wallets: state.wallets,
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
