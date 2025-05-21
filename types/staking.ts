import { Network } from "@gemwallet/api";

export type TxStatus = "approving" | "processing" | "success" | "error";

export interface TxHandlerOptions {
  onStatus?: (status: TxStatus, error?: string) => void;
}

export type OperationType = "asset" | "delegation" | "associate" | "dissociate";

export interface StakerBalance {
  clientChainID: number;
  stakerAddress: `0x${string}`;
  tokenID: `0x${string}`;
  totalBalance: bigint;
  claimable?: bigint; // the balance that could be claimed from imuachain(but might not be withdrawable)
  withdrawable: bigint; // the balance that could be withdrawn to user wallet on client chain
  delegated: bigint;
  pendingUndelegated: bigint;
  totalDeposited: bigint;
}

export interface WalletBalance {
  customClientChainID: number;
  stakerAddress: string;
  tokenID?: string;
  value: bigint;
  decimals: number;
  symbol: string;
}

export interface StakingPosition {
  assetId: string;
  tokenAddress: `0x${string}`;
  lzEndpointIdOrCustomChainId: number;
  totalBalance: bigint;
  claimableBalance: bigint;
  delegatedBalance: bigint;
  pendingUndelegatedBalance: bigint;
  metadata: {
    name: string;
    symbol: string;
    decimals: number;
    imuaChainIndex: string;
    metaInfo: string;
    totalStaked: bigint;
  };
}

export interface TokenInfo {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
}

export interface StakingProviderMetadata {
  chainName: string;
  evmChainID?: number;
  customChainIdByImua: number;
  portalContract: {
    name: string;
    address: `0x${string}` | null;
  };
}

export interface StakingContext {
  isConnected: boolean;
  isLoading: boolean;
  isStakingEnabled: boolean;
  whitelistedTokens: TokenInfo[];
}

export interface StakingProvider {
  // Core staking operations
  stake: (
    amount: bigint,
    vaultAddress: `0x${string}`,
    operatorAddress?: string,
    options?: TxHandlerOptions,
  ) => Promise<`0x${string}`>;
  withdrawPrincipal: (
    amount: bigint,
    recipient?: `0x${string}`,
    options?: TxHandlerOptions,
  ) => Promise<`0x${string}`>;
  delegateTo: (
    operator: string,
    amount: bigint,
    options?: TxHandlerOptions,
  ) => Promise<`0x${string}`>;
  undelegateFrom: (
    operator: string,
    amount: bigint,
    options?: TxHandlerOptions,
  ) => Promise<`0x${string}`>;
  // Fee estimation
  getQuote: (operation: OperationType) => Promise<bigint>;

  // core data
  isWalletConnected: boolean;
  isStakingEnabled: boolean;
  stakerBalance: StakerBalance | undefined;
  walletBalance: WalletBalance | undefined;
  vaultAddress: string | undefined;
  metadata?: StakingProviderMetadata;

  // functions that may not be supported by all staking providers
  deposit?: (
    amount: bigint,
    options?: TxHandlerOptions,
  ) => Promise<`0x${string}`>;
  depositAndDelegate?: (
    amount: bigint,
    operator: string,
    options?: TxHandlerOptions,
  ) => Promise<`0x${string}`>;
  claimPrincipal?: (
    amount: bigint,
    options?: TxHandlerOptions,
  ) => Promise<`0x${string}`>;
}

export interface GemWalletNetwork {
  chain: string;
  network: Network;
  websocket: string;
}

// Type for the GemWallet response
export interface GemWalletResponse {
  success: boolean;
  error?: string;
  xrpAddress?: string;
  data?: any;
}

export interface XRPStakingContext extends StakingContext {
  isInstalled: boolean;
  userAddress?: string;
  network?: GemWalletNetwork;
  isGemWalletConnected: boolean;
  isWagmiConnected: boolean;
  connect: () => Promise<GemWalletResponse>;
  disconnect: () => Promise<GemWalletResponse>;
  sendTransaction: (transaction: any) => Promise<GemWalletResponse>;
}
