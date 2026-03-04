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

// Provisional binding state (persisted across wallet switches)
export interface ProvisionalBinding {
  sourceAddress: string; // BTC/XRP address
  targetAddress: string; // EVM address (Imua address)
  chainType: "BTC" | "XRP";
  timestamp: number; // When it was set
}

export interface AllWalletsState {
  wallets: Record<number, GenericWalletState | undefined>;
  provisionalBindings: Record<string, ProvisionalBinding>; // Key: `${customChainId}-${sourceAddress.toLowerCase()}`

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

  // Provisional binding operations
  setProvisionalBinding: (
    customChainId: number,
    sourceAddress: string,
    targetAddress: string,
  ) => void;
  removeProvisionalBinding: (
    customChainId: number,
    sourceAddress: string,
  ) => void;
  clearAllProvisionalBindings: () => void;

  // Utility operations
  disconnectWallet: (customChainId: number) => void;
  clearBinding: (customChainId: number) => void;
  clearAllBindings: () => void;

  // Contract management
  setContract: (contract: any) => void;
}
