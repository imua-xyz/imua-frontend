export type TxStatus = 'approving' | 'processing' | 'success' | 'error'

export interface TxHandlerOptions {
  onStatus?: (status: TxStatus, error?: string) => void
}

export type OperationType = 'asset' | 'delegation' | 'associate' | 'dissociate'

export interface StakerBalance {
    clientChainID: number
    stakerAddress: `0x${string}`
    tokenID: `0x${string}`
    balance: bigint
    withdrawable: bigint
    delegated: bigint
    pendingUndelegated: bigint
    totalDeposited: bigint
}

export interface StakingPosition {
    assetId: string
    tokenAddress: `0x${string}`
    lzEndpointIdOrCustomChainId: number
    totalBalance: bigint
    claimableBalance: bigint
    delegatedBalance: bigint
    pendingUndelegatedBalance: bigint
    metadata: {
        name: string
        symbol: string
        decimals: number
        imuaChainIndex: string
        metaInfo: string
        totalStaked: bigint
    }
}

export interface StakingProvider {
  // Core staking operations
  stake: (amount: bigint, vaultAddress: `0x${string}`, operatorAddress?: string, options?: TxHandlerOptions) => Promise<`0x${string}`>;
  withdrawPrincipal: (amount: bigint, recipient?: `0x${string}`, options?: TxHandlerOptions) => Promise<`0x${string}`>;
  delegateTo: (operator: string, amount: bigint, options?: TxHandlerOptions) => Promise<`0x${string}`>;
  undelegateFrom: (operator: string, amount: bigint, options?: TxHandlerOptions) => Promise<`0x${string}`>;
  // Fee estimation
  getQuote: (operation: OperationType) => Promise<bigint>;

  // functions that may not be supported by all staking providers
  deposit?: (amount: bigint, options?: TxHandlerOptions) => Promise<`0x${string}`>;
  depositAndDelegate?: (amount: bigint, operator: string, options?: TxHandlerOptions) => Promise<`0x${string}`>;
  claimPrincipal?: (amount: bigint, options?: TxHandlerOptions) => Promise<`0x${string}`>;

  // Additional helpers specific to this staking mechanism
  [key: string]: any;
}
