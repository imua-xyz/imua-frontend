import { create } from "zustand";

export interface GenericWalletState {
  isConnected: boolean;
  address?: string;
  boundImuaAddress?: string;
}

export interface AllWalletsState {
  wallets: Record<number, GenericWalletState | undefined>;
  setWallet: (customChainId: number, state: GenericWalletState) => void;
  disconnectWallet: (customChainId: number) => void;
}

export const useAllWalletsStore = create<AllWalletsState>((set) => ({
  wallets: {},
  setWallet: (customChainId, state) =>
    set((prev) => ({ wallets: { ...prev.wallets, [customChainId]: state } })),
  disconnectWallet: (customChainId) =>
    set((prev) => {
      const newWallets = { ...prev.wallets };
      delete newWallets[customChainId];
      return { wallets: newWallets };
    }),
}));
