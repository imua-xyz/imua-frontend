import { create } from "zustand";
import { Token } from "@/types/tokens";

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

export function getQueryStakerAddress(token: Token): {
  queryAddress: string | undefined;
  stakerAddress: string | undefined;
} {
  const wallets = useAllWalletsStore.getState().wallets;
  const wallet = wallets[token.network.customChainIdByImua];
  let stakerAddress: string | undefined = undefined;
  let queryAddress: string | undefined = undefined;

  if (wallet) {
    if (token.connector.requireExtraConnectToImua) {
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
