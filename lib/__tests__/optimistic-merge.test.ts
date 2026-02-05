import { describe, it, expect } from "vitest";
import { mergeStakerAssets, mergeDelegations } from "@/lib/optimistic-merge";
import type { BootstrapStakerAsset, BootstrapDelegationState } from "@/lib/graphql/schema";
import type { PendingTransaction } from "@/types/optimistic-cache";
import { generateAssetId } from "@/lib/graphql/transformers";
import { tbtc, xrp } from "@/types/tokens";

const STAKER_ID = "0xuser_0x1";
const ASSET_ID = "0xtoken_0x1";
const OPERATOR = "0xoperator_0x1";

function asset(overrides: Partial<BootstrapStakerAsset> = {}): BootstrapStakerAsset {
  return {
    staker_id: STAKER_ID,
    asset_id: ASSET_ID,
    deposited: 100,
    withdrawable: 60,
    delegated: 40,
    updated_at_block: 0,
    ...overrides,
  };
}

function delegation(overrides: Partial<BootstrapDelegationState> = {}): BootstrapDelegationState {
  return {
    staker_id: STAKER_ID,
    asset_id: ASSET_ID,
    operator_addr: OPERATOR,
    delegated: 40,
    updated_at_block: 0,
    ...overrides,
  };
}

function pendingTx(overrides: Partial<PendingTransaction> = {}): PendingTransaction {
  return {
    txHash: "0xabc",
    operation: "deposit",
    stakerId: STAKER_ID,
    assetId: ASSET_ID,
    blockHeight: 10,
    timestamp: Date.now(),
    amount: "50",
    ...overrides,
  };
}

describe("mergeStakerAssets", () => {
  it("returns graphql data when no pending txs", () => {
    const data = [asset()];
    expect(mergeStakerAssets(data, [])).toEqual(data);
  });

  it("skips tx when blockHeight <= asset updated_at_block (already indexed)", () => {
    const data = [asset({ updated_at_block: 15 })];
    const txs = [pendingTx({ blockHeight: 10 })];
    const result = mergeStakerAssets(data, txs);
    expect(result[0].deposited).toBe(100);
    expect(result[0].withdrawable).toBe(60);
  });

  it("applies deposit: increases deposited and withdrawable", () => {
    const data = [asset({ updated_at_block: 0 })];
    const txs = [pendingTx({ operation: "deposit", amount: "50", blockHeight: 10 })];
    const result = mergeStakerAssets(data, txs);
    expect(result[0].deposited).toBe(150);
    expect(result[0].withdrawable).toBe(110);
    expect(result[0].delegated).toBe(40);
  });

  it("applies stake: increases deposited and delegated", () => {
    const data = [asset({ updated_at_block: 0 })];
    const txs = [pendingTx({ operation: "stake", amount: "20", blockHeight: 10, operatorAddress: OPERATOR })];
    const result = mergeStakerAssets(data, txs);
    expect(result[0].deposited).toBe(120);
    expect(result[0].delegated).toBe(60);
    expect(result[0].withdrawable).toBe(60);
  });

  it("applies delegate: moves from withdrawable to delegated", () => {
    const data = [asset({ updated_at_block: 0 })];
    const txs = [pendingTx({ operation: "delegate", amount: "30", blockHeight: 10, operatorAddress: OPERATOR })];
    const result = mergeStakerAssets(data, txs);
    expect(result[0].withdrawable).toBe(30);
    expect(result[0].delegated).toBe(70);
    expect(result[0].deposited).toBe(100);
  });

  it("applies undelegate: moves from delegated to withdrawable", () => {
    const data = [asset({ updated_at_block: 0 })];
    const txs = [pendingTx({ operation: "undelegate", amount: "20", blockHeight: 10, operatorAddress: OPERATOR })];
    const result = mergeStakerAssets(data, txs);
    expect(result[0].delegated).toBe(20);
    expect(result[0].withdrawable).toBe(80);
    expect(result[0].deposited).toBe(100);
  });

  it("applies claim: decreases deposited and withdrawable", () => {
    const data = [asset({ updated_at_block: 0 })];
    const txs = [pendingTx({ operation: "claim", amount: "25", blockHeight: 10 })];
    const result = mergeStakerAssets(data, txs);
    expect(result[0].deposited).toBe(75);
    expect(result[0].withdrawable).toBe(35);
    expect(result[0].delegated).toBe(40);
  });

  it("applies withdraw for BTC/XRP asset: decreases deposited and withdrawable", () => {
    const btcAssetId = generateAssetId(tbtc.address, tbtc.network.customChainIdByImua).toLowerCase();
    const data = [asset({ asset_id: btcAssetId, staker_id: STAKER_ID, updated_at_block: 0 })];
    const txs = [pendingTx({ operation: "withdraw", amount: "10", blockHeight: 10, assetId: btcAssetId })];
    const result = mergeStakerAssets(data, txs);
    expect(result[0].deposited).toBe(90);
    expect(result[0].withdrawable).toBe(50);
    expect(result[0].delegated).toBe(40);
  });

  it("does not apply withdraw for non-BTC/XRP asset", () => {
    const data = [asset({ updated_at_block: 0 })];
    const txs = [pendingTx({ operation: "withdraw", amount: "10", blockHeight: 10 })];
    const result = mergeStakerAssets(data, txs);
    expect(result[0].deposited).toBe(100);
    expect(result[0].withdrawable).toBe(60);
  });

  it("applies txs in block height order", () => {
    const data = [asset({ updated_at_block: 0 })];
    const txs = [
      pendingTx({ operation: "delegate", amount: "20", blockHeight: 12, operatorAddress: OPERATOR }),
      pendingTx({ operation: "deposit", amount: "100", blockHeight: 10 }),
    ];
    const result = mergeStakerAssets(data, txs);
    expect(result[0].deposited).toBe(200);
    expect(result[0].withdrawable).toBe(60 + 100 - 20);
    expect(result[0].delegated).toBe(40 + 20);
  });

  it("maintains deposited = withdrawable + delegated", () => {
    const data = [asset({ deposited: 100, withdrawable: 60, delegated: 40, updated_at_block: 0 })];
    const txs = [pendingTx({ operation: "delegate", amount: "60", blockHeight: 10, operatorAddress: OPERATOR })];
    const result = mergeStakerAssets(data, txs);
    expect(result[0].deposited).toBe(result[0].withdrawable + result[0].delegated);
  });

  it("creates asset from tx when not in graphql data", () => {
    const txs = [pendingTx({ operation: "deposit", amount: "100", blockHeight: 10 })];
    const result = mergeStakerAssets([], txs);
    expect(result).toHaveLength(1);
    expect(result[0].staker_id).toBe(STAKER_ID);
    expect(result[0].asset_id).toBe(ASSET_ID);
    expect(result[0].deposited).toBe(100);
    expect(result[0].withdrawable).toBe(100);
    expect(result[0].delegated).toBe(0);
  });
});

describe("mergeDelegations", () => {
  it("returns graphql data when no pending txs", () => {
    const data = [delegation()];
    expect(mergeDelegations(data, [])).toEqual(data);
  });

  it("skips tx when blockHeight <= delegation updated_at_block", () => {
    const data = [delegation({ updated_at_block: 15 })];
    const txs = [pendingTx({ operation: "delegate", blockHeight: 10, operatorAddress: OPERATOR })];
    const result = mergeDelegations(data, txs);
    expect(result[0].delegated).toBe(40);
  });

  it("applies delegate: increases delegated for operator", () => {
    const data = [delegation({ updated_at_block: 0 })];
    const txs = [pendingTx({ operation: "delegate", amount: "30", blockHeight: 10, operatorAddress: OPERATOR })];
    const result = mergeDelegations(data, txs);
    expect(result[0].delegated).toBe(70);
  });

  it("applies undelegate: decreases delegated", () => {
    const data = [delegation({ updated_at_block: 0 })];
    const txs = [pendingTx({ operation: "undelegate", amount: "20", blockHeight: 10, operatorAddress: OPERATOR })];
    const result = mergeDelegations(data, txs);
    expect(result[0].delegated).toBe(20);
  });

  it("removes delegation when delegated becomes zero", () => {
    const data = [delegation({ delegated: 40, updated_at_block: 0 })];
    const txs = [pendingTx({ operation: "undelegate", amount: "40", blockHeight: 10, operatorAddress: OPERATOR })];
    const result = mergeDelegations(data, txs);
    expect(result).toHaveLength(0);
  });

  it("ignores non-delegation operations", () => {
    const data = [delegation({ updated_at_block: 0 })];
    const txs = [pendingTx({ operation: "deposit", amount: "50", blockHeight: 10 })];
    const result = mergeDelegations(data, txs);
    expect(result[0].delegated).toBe(40);
  });

  it("creates delegation from tx when not in graphql data", () => {
    const txs = [pendingTx({ operation: "stake", amount: "100", blockHeight: 10, operatorAddress: OPERATOR })];
    const result = mergeDelegations([], txs);
    expect(result).toHaveLength(1);
    expect(result[0].operator_addr).toBe(OPERATOR);
    expect(result[0].delegated).toBe(100);
  });
});
