import { describe, it, expect, beforeEach } from "vitest";
import { useOptimisticCacheStore } from "@/stores/optimisticCacheStore";
import type { PendingTransaction } from "@/types/optimistic-cache";

const STAKER_ID = "0xuser_0x1";
const ASSET_ID = "0xtoken_0x1";
const OPERATOR = "0xoperator_0x1";

function tx(overrides: Partial<PendingTransaction> = {}): PendingTransaction {
  return {
    txHash: "0xhash1",
    operation: "deposit",
    stakerId: STAKER_ID,
    assetId: ASSET_ID,
    blockHeight: 10,
    timestamp: Date.now(),
    amount: "100",
    ...overrides,
  };
}

describe("optimisticCacheStore", () => {
  beforeEach(() => {
    useOptimisticCacheStore.getState().clearAll();
  });

  describe("addPendingTransaction / getAllPendingTransactions", () => {
    it("adds and retrieves pending transactions", () => {
      const store = useOptimisticCacheStore.getState();
      store.addPendingTransaction(tx());
      expect(store.getAllPendingTransactions()).toHaveLength(1);
      store.addPendingTransaction(tx({ txHash: "0xhash2" }));
      expect(store.getAllPendingTransactions()).toHaveLength(2);
    });
  });

  describe("removePendingTransaction", () => {
    it("removes by txHash", () => {
      const store = useOptimisticCacheStore.getState();
      store.addPendingTransaction(tx());
      store.removePendingTransaction("0xhash1");
      expect(store.getAllPendingTransactions()).toHaveLength(0);
    });
  });

  describe("getPendingTransactions", () => {
    it("filters by stakerId and assetId (case insensitive)", () => {
      const store = useOptimisticCacheStore.getState();
      store.addPendingTransaction(tx());
      store.addPendingTransaction(tx({ txHash: "0xhash2", stakerId: "0xother_0x1" }));
      const list = store.getPendingTransactions(STAKER_ID, ASSET_ID);
      expect(list).toHaveLength(1);
      expect(list[0].stakerId).toBe(STAKER_ID);
    });
  });

  describe("clearExpiredTransactions", () => {
    it("removes tx when asset block height >= tx block height (staker asset only)", () => {
      const store = useOptimisticCacheStore.getState();
      store.addPendingTransaction(tx({ operation: "deposit", blockHeight: 10 }));
      const heights = new Map<string, number>();
      heights.set(ASSET_ID.toLowerCase(), 15);
      store.clearExpiredTransactions(heights);
      expect(store.getAllPendingTransactions()).toHaveLength(0);
    });

    it("keeps tx when asset block height < tx block height", () => {
      const store = useOptimisticCacheStore.getState();
      store.addPendingTransaction(tx({ operation: "deposit", blockHeight: 10 }));
      const heights = new Map<string, number>();
      heights.set(ASSET_ID.toLowerCase(), 5);
      store.clearExpiredTransactions(heights);
      expect(store.getAllPendingTransactions()).toHaveLength(1);
    });

    it("keeps delegation tx until delegation record is indexed", () => {
      const store = useOptimisticCacheStore.getState();
      store.addPendingTransaction(
        tx({ operation: "delegate", blockHeight: 10, operatorAddress: OPERATOR }),
      );
      const heights = new Map<string, number>();
      heights.set(ASSET_ID.toLowerCase(), 15);
      const delegationKey = `${STAKER_ID}_${ASSET_ID}_${OPERATOR}`.toLowerCase();
      heights.set(delegationKey, 5);
      store.clearExpiredTransactions(heights);
      expect(store.getAllPendingTransactions()).toHaveLength(1);
      heights.set(delegationKey, 15);
      store.clearExpiredTransactions(heights);
      expect(store.getAllPendingTransactions()).toHaveLength(0);
    });
  });

  describe("clearByChainId", () => {
    it("removes transactions for the given chain", () => {
      const store = useOptimisticCacheStore.getState();
      store.addPendingTransaction(tx({ stakerId: "0xuser_0x1", assetId: "0xtoken_0x1" }));
      store.clearByChainId(1);
      expect(store.getAllPendingTransactions()).toHaveLength(0);
    });

    it("keeps transactions for other chains", () => {
      const store = useOptimisticCacheStore.getState();
      store.addPendingTransaction(tx({ stakerId: "0xuser_0x7a69", assetId: "0xtoken_0x7a69" }));
      store.clearByChainId(1);
      expect(store.getAllPendingTransactions()).toHaveLength(1);
    });
  });

  describe("clearAll", () => {
    it("removes all pending transactions", () => {
      const store = useOptimisticCacheStore.getState();
      store.addPendingTransaction(tx());
      store.clearAll();
      expect(store.getAllPendingTransactions()).toHaveLength(0);
    });
  });
});
