import { BaseTxOptions, NSTStakeParams, NSTVerifyParams } from "./staking";
import { StakerBalance, WalletBalance, OperationType } from "./staking";
import { Token } from "./tokens";

export interface StakingService {
  // core data
  token: Token;
  stakerBalance: StakerBalance | undefined;
  walletBalance: WalletBalance | undefined;
  vaultAddress: string | undefined;
  minimumStakeAmount?: bigint;
  isDepositThenDelegateDisabled?: boolean;
  isOnlyDepositThenDelegateAllowed?: boolean;

  // Core staking operations
  stake: (
    amount: bigint,
    operatorAddress?: string,
    options?: Pick<BaseTxOptions, "onPhaseChange">,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  withdrawPrincipal: (
    amount: bigint,
    recipient?: `0x${string}`,
    options?: Pick<BaseTxOptions, "onPhaseChange">,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  delegateTo: (
    operator: string,
    amount: bigint,
    options?: Pick<BaseTxOptions, "onPhaseChange">,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  undelegateFrom: (
    operator: string,
    amount: bigint,
    instantUnbond: boolean,
    options?: Pick<BaseTxOptions, "onPhaseChange">,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  // Fee estimation
  getQuote: (operation: OperationType) => Promise<bigint>;

  // functions that may not be supported by all staking providers
  deposit?: (
    amount: bigint,
    approvingTx?: () => Promise<`0x${string}`>,
    options?: Pick<BaseTxOptions, "onPhaseChange">,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  depositAndDelegate?: (
    amount: bigint,
    operator: string,
    approvingTx?: () => Promise<`0x${string}`>,
    options?: Pick<BaseTxOptions, "onPhaseChange">,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  claimPrincipal?: (
    amount: bigint,
    options?: Pick<BaseTxOptions, "onPhaseChange">,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  nstStake?: (
    stakeParams: NSTStakeParams,
    amount: bigint,
    options?: Pick<BaseTxOptions, "onPhaseChange">,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  nstVerifyAndDeposit?: (
    verifyParams: NSTVerifyParams,
    options?: Pick<BaseTxOptions, "onPhaseChange">,
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  createCapsule?: (
    options?: Pick<BaseTxOptions, "onPhaseChange">
  ) => Promise<{ address: string; txHash: string; success: boolean; error?: string }>;
  checkCapsuleExists?: () => Promise<string | null>;
  isPectraMode?: (capsuleAddress: string) => Promise<boolean>;
  addBlockRootForTimestamp?: (
    timestamp: string,
    options?: Pick<BaseTxOptions, "onPhaseChange">
  ) => Promise<{ hash: string; success: boolean; error?: string }>;
  hasBlockRootForTimestamp?: (
    timestamp: string,
  ) => Promise<boolean>;
}
