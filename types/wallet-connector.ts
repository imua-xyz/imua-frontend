// Wallet connection state
export interface WalletState {
  connected: boolean;
  address?: string;
  balance: {
    value: bigint;
    decimals: number;
    symbol: string;
  };
}

// Binding state for address binding
export interface BindingState {
  isBound: boolean;
  expectedBoundAddress?: string;
}

// Issue with its resolver
export interface IssueWithResolver {
  resolve?: () => Promise<void>;
  needsAction: boolean;
}

// Connection issues with their resolvers
export interface ConnectionIssues {
  needsInstallNative?: IssueWithResolver;
  needsConnectNative?: IssueWithResolver;
  needsSwitchNative?: IssueWithResolver;
  needsConnectBindingEVM?: IssueWithResolver;
  needsSwitchBindingEVM?: IssueWithResolver;
  needsMatchingAddress?: IssueWithResolver;
  others?: string[];
}

export interface WalletConnector {
  // Overall status
  isReadyForStaking: boolean;

  // Native wallet state (XRP, Bitcoin, etc.)
  nativeWallet: WalletState;

  // Binding EVM wallet state (only present if binding required)
  bindingEVMWallet?: WalletState;

  // Address binding state
  bindingState?: BindingState;

  // Connection issues with their resolvers
  issues?: ConnectionIssues;

  // Utility actions (not tied to specific issues)
  disconnectNative: () => Promise<void>;
  disconnectBindingEVM?: () => Promise<void>;
}

export interface EVMWalletConnector extends WalletConnector {
  // EVM wallets don't need binding, so bindingEVMWallet is omitted
  bindingEVMWallet: never;
  bindingState: never;

  // Required utility actions for EVM
  disconnectNative: () => Promise<void>;
}

export interface XRPWalletConnector extends WalletConnector {
  // XRP requires binding to EVM wallet
  bindingEVMWallet: WalletState;
  bindingState: BindingState;

  // Required utility actions for XRP
  disconnectNative: () => Promise<void>;
  disconnectBindingEVM: () => Promise<void>;
}

export interface BitcoinWalletConnector extends WalletConnector {
  // Bitcoin requires binding to EVM wallet
  bindingEVMWallet: WalletState;
  bindingState: BindingState;

  // Required utility actions for Bitcoin
  disconnectNative: () => Promise<void>;
  disconnectBindingEVM: () => Promise<void>;
}
