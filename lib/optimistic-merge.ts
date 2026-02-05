import {
  BootstrapStakerAsset,
  BootstrapDelegationState,
} from "@/lib/graphql/schema";
import { generateAssetId } from "@/lib/graphql/transformers";
import { tbtc, xrp } from "@/types/tokens";
import { PendingTransaction } from "@/types/optimistic-cache";
import {
  affectsDelegations,
  isUndelegateOperation,
} from "@/types/operations";

// Withdraw for BTC/XRP is claim+withdraw in one step; only these assets affect staker asset tracking
const WITHDRAW_AFFECTS_STAKER_ASSET_IDS = new Set([
  generateAssetId(tbtc.address, tbtc.network.customChainIdByImua).toLowerCase(),
  generateAssetId(xrp.address, xrp.network.customChainIdByImua).toLowerCase(),
]);

/**
 * Merge optimistic updates into staker assets data
 * Each record has its own updated_at_block, so we check transactions against the specific asset's block height
 * @param graphqlData - Data from GraphQL indexer (each record has its own updated_at_block)
 * @param pendingTxs - Pending transactions to apply optimistically
 * @returns Merged staker assets with optimistic updates applied
 */
export function mergeStakerAssets(
  graphqlData: BootstrapStakerAsset[],
  pendingTxs: PendingTransaction[],
): BootstrapStakerAsset[] {
  // Sort transactions by block height to apply in order
  const sortedTxs = [...pendingTxs].sort((a, b) => a.blockHeight - b.blockHeight);

  // Create a map of assetId -> merged asset for efficient lookup
  const mergedAssetsMap = new Map<string, BootstrapStakerAsset>();

  // Start with GraphQL data
  graphqlData.forEach((asset) => {
    mergedAssetsMap.set(asset.asset_id.toLowerCase(), { ...asset });
  });

  // Apply optimistic updates sequentially, checking each transaction against the specific asset's updated_at_block
  sortedTxs.forEach((tx) => {
    const assetId = tx.assetId.toLowerCase();
    const existingAsset = mergedAssetsMap.get(assetId);

    // Get the asset's specific block height (or 0 if not indexed yet)
    const assetBlockHeight = existingAsset?.updated_at_block ?? 0;

    // Only apply transaction if it hasn't been indexed for this specific asset
    if (tx.blockHeight <= assetBlockHeight) {
      return; // Skip - this transaction has already been indexed for this asset
    }

    // Initialize asset if it doesn't exist in GraphQL data
    const baseAsset: BootstrapStakerAsset = existingAsset || {
      staker_id: tx.stakerId,
      asset_id: tx.assetId,
      deposited: 0,
      withdrawable: 0,
      delegated: 0,
    };

    // Convert GraphQL numbers to bigint for calculations
    let deposited = BigInt(Math.floor(baseAsset.deposited));
    let withdrawable = BigInt(Math.floor(baseAsset.withdrawable));
    let delegated = BigInt(Math.floor(baseAsset.delegated));

    // Calculate deltas based on operation type and amount
    const amount = BigInt(tx.amount);

    switch (tx.operation) {
      case "deposit":
        // Deposit: increases deposited and withdrawable
        deposited = deposited + amount;
        withdrawable = withdrawable + amount;
        break;

      case "stake":
        // Stake: deposit + delegate in one operation
        deposited = deposited + amount;
        delegated = delegated + amount;
        // withdrawable stays the same (amount goes from wallet -> deposited -> delegated)
        break;

      case "delegate":
        // Delegate: moves from withdrawable to delegated
        delegated = delegated + amount;
        withdrawable = withdrawable - amount;
        // Ensure withdrawable doesn't go negative
        if (withdrawable < BigInt(0)) {
          withdrawable = BigInt(0);
        }
        break;

      case "undelegate":
        // Undelegate: moves from delegated to withdrawable
        delegated = delegated - amount;
        withdrawable = withdrawable + amount;
        // Ensure delegated doesn't go negative
        if (delegated < BigInt(0)) {
          delegated = BigInt(0);
        }
        break;

      case "claim":
        // Claim: decreases deposited and withdrawable (unlocks from tracking)
        deposited = deposited - amount;
        withdrawable = withdrawable - amount;
        // Ensure values don't go negative
        if (deposited < BigInt(0)) {
          deposited = BigInt(0);
        }
        if (withdrawable < BigInt(0)) {
          withdrawable = BigInt(0);
        }
        break;

      case "withdraw":
        // For BTC/XRP, withdraw is claim+withdraw in one step: decrease withdrawable and deposited
        if (WITHDRAW_AFFECTS_STAKER_ASSET_IDS.has(assetId)) {
          deposited = deposited - amount;
          withdrawable = withdrawable - amount;
          if (deposited < BigInt(0)) deposited = BigInt(0);
          if (withdrawable < BigInt(0)) withdrawable = BigInt(0);
        }
        break;
    }

    // Ensure deposited = withdrawable + delegated (constraint from schema)
    const calculatedDeposited = withdrawable + delegated;
    if (deposited !== calculatedDeposited) {
      // Adjust deposited to maintain constraint
      deposited = calculatedDeposited;
    }

    // Update merged asset
    mergedAssetsMap.set(assetId, {
      ...baseAsset,
      deposited: Number(deposited),
      withdrawable: Number(withdrawable),
      delegated: Number(delegated),
    });
  });

  return Array.from(mergedAssetsMap.values());
}

/**
 * Merge optimistic updates into delegations data
 * Each record has its own updated_at_block, so we check transactions against the specific delegation's block height
 * @param graphqlData - Data from GraphQL indexer (each record has its own updated_at_block)
 * @param pendingTxs - Pending transactions to apply optimistically
 * @returns Merged delegations with optimistic updates applied
 */
export function mergeDelegations(
  graphqlData: BootstrapDelegationState[],
  pendingTxs: PendingTransaction[],
): BootstrapDelegationState[] {
  // Sort transactions by block height to apply in order
  const sortedTxs = [...pendingTxs].sort((a, b) => a.blockHeight - b.blockHeight);

  // Create a map of operator -> delegation for efficient lookup
  const mergedDelegationsMap = new Map<string, BootstrapDelegationState>();

  // Start with GraphQL data
  graphqlData.forEach((delegation) => {
    const key = `${delegation.operator_addr.toLowerCase()}`;
    mergedDelegationsMap.set(key, { ...delegation });
  });

  // Apply optimistic updates sequentially, checking each transaction against the specific delegation's updated_at_block
  sortedTxs.forEach((tx) => {
    // Only process delegation-related operations (stake, delegate, undelegate)
    if (!affectsDelegations(tx.operation)) {
      return;
    }

    // Skip if no operator address (shouldn't happen for these operations, but be safe)
    if (!tx.operatorAddress) {
      return;
    }

    const operatorKey = tx.operatorAddress.toLowerCase();
    const amount = BigInt(tx.amount);

    // Calculate delta based on operation type
    let delta: bigint;
    if (isUndelegateOperation(tx.operation)) {
      delta = -amount; // Negative delta for undelegate
    } else {
      delta = amount; // Positive delta for stake and delegate
    }

    const existingDelegation = mergedDelegationsMap.get(operatorKey);

    // Get the delegation's specific block height (or 0 if not indexed yet)
    const delegationBlockHeight = existingDelegation?.updated_at_block ?? 0;

    // Only apply transaction if it hasn't been indexed for this specific delegation
    if (tx.blockHeight <= delegationBlockHeight) {
      return; // Skip - this transaction has already been indexed for this delegation
    }

    // Initialize delegation if it doesn't exist
    const baseDelegation: BootstrapDelegationState = existingDelegation || {
      staker_id: tx.stakerId,
      asset_id: tx.assetId,
      operator_addr: tx.operatorAddress,
      delegated: 0,
    };

    // Convert GraphQL number to bigint, apply delta, convert back
    const currentDelegated = BigInt(Math.floor(baseDelegation.delegated));
    const newDelegated = currentDelegated + delta;

    // Remove if delegation becomes zero or negative
    if (newDelegated <= BigInt(0)) {
      mergedDelegationsMap.delete(operatorKey);
    } else {
      mergedDelegationsMap.set(operatorKey, {
        ...baseDelegation,
        delegated: Number(newDelegated),
      });
    }
  });

  return Array.from(mergedDelegationsMap.values());
}

