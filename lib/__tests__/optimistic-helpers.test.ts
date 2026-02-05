import { describe, it, expect, beforeEach } from "vitest";
import { storePendingTransaction } from "@/lib/optimistic-helpers";
import { useOptimisticCacheStore } from "@/stores/optimisticCacheStore";
import { tbtc } from "@/types/tokens";

describe("optimistic-helpers", () => {
  beforeEach(() => {
    useOptimisticCacheStore.getState().clearAll();
  });

  describe("storePendingTransaction", () => {
    it("adds a pending transaction with correct stakerId and assetId", () => {
      const txHash = "0xabc123";
      const address = "0xUserAddress";
      storePendingTransaction(txHash, "deposit", tbtc, address, 100, 50n);

      const all = useOptimisticCacheStore.getState().getAllPendingTransactions();
      expect(all).toHaveLength(1);
      expect(all[0].txHash).toBe(txHash);
      expect(all[0].operation).toBe("deposit");
      expect(all[0].blockHeight).toBe(100);
      expect(all[0].amount).toBe("50");
      expect(all[0].stakerId).toBe(
        `${address.toLowerCase()}_0x${tbtc.network.customChainIdByImua.toString(16)}`,
      );
      expect(all[0].assetId).toBe(
        `${tbtc.address.toLowerCase()}_0x${tbtc.network.customChainIdByImua.toString(16)}`,
      );
    });

    it("stores operator address for delegate (lowercase)", () => {
      useOptimisticCacheStore.getState().clearAll();
      storePendingTransaction(
        "0xhash",
        "delegate",
        tbtc,
        "0xuser",
        50,
        100n,
        "0xOperatorAddr",
      );
      const all = useOptimisticCacheStore.getState().getAllPendingTransactions();
      expect(all[0].operatorAddress).toBe("0xoperatoraddr");
    });
  });
});
