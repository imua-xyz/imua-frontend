import { useOptimisticCacheStore } from "@/stores/optimisticCacheStore";
import { PendingTransaction } from "@/types/optimistic-cache";
import { StakingOperation } from "@/types/operations";
import { Token } from "@/types/tokens";
import { generateStakerId, generateAssetId } from "@/lib/graphql/transformers";

/**
 * Helper to store a pending transaction after confirmation
 * Stores operation details (amount, operator) instead of pre-calculated deltas
 * @param txHash - Transaction hash
 * @param operation - Operation type
 * @param token - Token involved
 * @param queryAddress - Staker query address
 * @param blockHeight - Block height when transaction was confirmed
 * @param amount - Operation amount
 * @param operatorAddress - Operator address (for delegate/stake/undelegate operations, optional)
 */
export function storePendingTransaction(
  txHash: string,
  operation: StakingOperation,
  token: Token,
  queryAddress: string,
  blockHeight: number,
  amount: bigint,
  operatorAddress?: string,
) {
  const store = useOptimisticCacheStore.getState();

  const stakerId = generateStakerId(
    queryAddress,
    token.network.customChainIdByImua,
  );
  const assetId = generateAssetId(
    token.address,
    token.network.customChainIdByImua,
  );

  const pendingTx: PendingTransaction = {
    txHash,
    operation,
    stakerId,
    assetId,
    blockHeight,
    timestamp: Date.now(),
    amount: amount.toString(), // Serialize bigint as string
    operatorAddress: operatorAddress?.toLowerCase(),
  };

  store.addPendingTransaction(pendingTx);
}
