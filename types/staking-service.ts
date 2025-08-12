import { TxHandlerOptions } from "./staking";
import { StakerBalance, WalletBalance, OperationType } from "./staking";
import { NativeToken, LSTToken, NSTToken } from "./tokens";

export interface StakingService {
  // core data
  token: NativeToken | LSTToken | NSTToken;
  stakerBalance: StakerBalance | undefined;
  walletBalance: WalletBalance | undefined;
  vaultAddress: string | undefined;
  minimumStakeAmount?: bigint;
  isDepositThenDelegateDisabled?: boolean;

  // Core staking operations
  stake: (
    amount: bigint,
    operatorAddress?: string,
    options?: TxHandlerOptions,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  withdrawPrincipal: (
    amount: bigint,
    recipient?: `0x${string}`,
    options?: TxHandlerOptions,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  delegateTo: (
    operator: string,
    amount: bigint,
    options?: TxHandlerOptions,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  undelegateFrom: (
    operator: string,
    amount: bigint,
    instantUnbond: boolean,
    options?: TxHandlerOptions,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  // Fee estimation
  getQuote: (operation: OperationType) => Promise<bigint>;

  // functions that may not be supported by all staking providers
  deposit?: (
    amount: bigint,
    options?: TxHandlerOptions,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  depositAndDelegate?: (
    amount: bigint,
    operator: string,
    options?: TxHandlerOptions,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  claimPrincipal?: (
    amount: bigint,
    options?: TxHandlerOptions,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
}
