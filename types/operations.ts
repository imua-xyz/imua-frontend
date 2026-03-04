// Operation types for Imua Protocol staking operations

/**
 * Staking operation types
 * 
 * - deposit: Lock assets in vault without delegating (no yield generation)
 * - stake: Deposit and delegate in one operation (generates yield)
 * - delegate: Delegate from claimable balance to operator (generates yield)
 * - undelegate: Remove delegation from operator (stops yield generation)
 * - withdraw: Withdraw unlocked tokens from vault to wallet
 * - claim: Unlock tokens from Imuachain tracking to vault (post-bootstrap)
 */
export type StakingOperation =
  | "deposit"
  | "stake"
  | "delegate"
  | "undelegate"
  | "withdraw"
  | "claim";

/**
 * Check if an operation affects staker assets (deposited/withdrawable/delegated)
 */
export function affectsStakerAssets(operation: StakingOperation): boolean {
  return ["deposit", "stake", "delegate", "undelegate", "withdraw", "claim"].includes(
    operation,
  );
}

/**
 * Check if an operation affects delegations
 */
export function affectsDelegations(operation: StakingOperation): boolean {
  return ["stake", "delegate", "undelegate"].includes(operation);
}

/**
 * Check if an operation only deposits (does not delegate)
 */
export function isDepositOnly(operation: StakingOperation): boolean {
  return operation === "deposit";
}

/**
 * Check if an operation delegates (stake or delegate)
 */
export function isDelegationOperation(operation: StakingOperation): boolean {
  return operation === "stake" || operation === "delegate";
}

/**
 * Check if an operation directly modifies the staker asset record
 * (deposit, stake, claim, withdraw - NOT delegate/undelegate which only affect delegation records)
 * 
 * Note: delegate/undelegate operations modify delegation records which are tracked separately.
 * The staker asset record aggregates these, but for block height tracking purposes,
 * we only need to check the asset record for these four operations.
 */
export function affectsStakerAssetRecord(operation: StakingOperation): boolean {
  return ["deposit", "stake", "claim", "withdraw"].includes(operation);
}

/**
 * Check if an operation is undelegate (removes delegation, negative delta)
 */
export function isUndelegateOperation(operation: StakingOperation): boolean {
  return operation === "undelegate";
}
