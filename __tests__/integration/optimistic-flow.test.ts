import { describe, it, expect, beforeEach } from "vitest";
import { useOptimisticCacheStore } from "@/stores/optimisticCacheStore";
import { mergeStakerAssets } from "@/lib/optimistic-merge";
import { storePendingTransaction } from "@/lib/optimistic-helpers";
import { generateStakerId, generateAssetId } from "@/lib/graphql/transformers";
import { tbtc } from "@/types/tokens";
import type { BootstrapStakerAsset } from "@/lib/graphql/schema";

const QUERY_ADDRESS = "0xuser";
const STAKER_ID = generateStakerId(QUERY_ADDRESS, tbtc.network.customChainIdByImua);
const ASSET_ID = generateAssetId(tbtc.address, tbtc.network.customChainIdByImua);

/**
 * Integration test: full optimistic update flow.
 * 1. User confirms tx -> storePendingTransaction
 * 2. UI reads: GraphQL data + merge(pending) -> merged balance
 * 3. Indexer catches up -> clearExpiredTransactions -> pending removed
 */
describe("optimistic flow (integration)", () => {

  beforeEach(() => {
    useOptimisticCacheStore.getState().clearAll();
  });

  it("store -> merge -> clearExpired reflects correct state changes", () => {
    const baseAssets: BootstrapStakerAsset[] = [
      {
        staker_id: STAKER_ID,
        asset_id: ASSET_ID.toLowerCase(),
        deposited: 100,
        withdrawable: 60,
        delegated: 40,
        updated_at_block: 0,
      },
    ];

    storePendingTransaction(
      "0xtx1",
      "deposit",
      tbtc,
      QUERY_ADDRESS,
      10,
      BigInt(50),
    );

    const pending = useOptimisticCacheStore.getState().getPendingTransactions(STAKER_ID, ASSET_ID);
    expect(pending).toHaveLength(1);

    const merged = mergeStakerAssets(baseAssets, pending);
    expect(merged).toHaveLength(1);
    expect(merged[0].deposited).toBe(150);
    expect(merged[0].withdrawable).toBe(110);

    const heights = new Map<string, number>();
    heights.set(ASSET_ID, 15);
    useOptimisticCacheStore.getState().clearExpiredTransactions(heights);

    const pendingAfter = useOptimisticCacheStore.getState().getPendingTransactions(STAKER_ID, ASSET_ID);
    expect(pendingAfter).toHaveLength(0);

    const mergedAfterIndexer = mergeStakerAssets(
      [{ ...baseAssets[0], updated_at_block: 15 }],
      pendingAfter,
    );
    expect(mergedAfterIndexer[0].deposited).toBe(100);
    expect(mergedAfterIndexer[0].withdrawable).toBe(60);
  });
});
