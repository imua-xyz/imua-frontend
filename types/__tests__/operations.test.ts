import { describe, it, expect } from "vitest";
import {
  affectsStakerAssets,
  affectsDelegations,
  affectsStakerAssetRecord,
  isDepositOnly,
  isDelegationOperation,
  isUndelegateOperation,
} from "@/types/operations";
import type { StakingOperation } from "@/types/operations";

const ALL_OPERATIONS: StakingOperation[] = [
  "deposit",
  "stake",
  "delegate",
  "undelegate",
  "withdraw",
  "claim",
];

describe("operations", () => {
  describe("affectsStakerAssets", () => {
    it("returns true for all staking operations", () => {
      ALL_OPERATIONS.forEach((op) => {
        expect(affectsStakerAssets(op)).toBe(true);
      });
    });
  });

  describe("affectsDelegations", () => {
    it("returns true only for stake, delegate, undelegate", () => {
      expect(affectsDelegations("stake")).toBe(true);
      expect(affectsDelegations("delegate")).toBe(true);
      expect(affectsDelegations("undelegate")).toBe(true);
      expect(affectsDelegations("deposit")).toBe(false);
      expect(affectsDelegations("withdraw")).toBe(false);
      expect(affectsDelegations("claim")).toBe(false);
    });
  });

  describe("affectsStakerAssetRecord", () => {
    it("returns true for deposit, stake, claim, withdraw (not delegate/undelegate)", () => {
      expect(affectsStakerAssetRecord("deposit")).toBe(true);
      expect(affectsStakerAssetRecord("stake")).toBe(true);
      expect(affectsStakerAssetRecord("claim")).toBe(true);
      expect(affectsStakerAssetRecord("withdraw")).toBe(true);
      expect(affectsStakerAssetRecord("delegate")).toBe(false);
      expect(affectsStakerAssetRecord("undelegate")).toBe(false);
    });
  });

  describe("isDepositOnly", () => {
    it("returns true only for deposit", () => {
      expect(isDepositOnly("deposit")).toBe(true);
      expect(isDepositOnly("stake")).toBe(false);
      expect(isDepositOnly("withdraw")).toBe(false);
    });
  });

  describe("isDelegationOperation", () => {
    it("returns true for stake and delegate", () => {
      expect(isDelegationOperation("stake")).toBe(true);
      expect(isDelegationOperation("delegate")).toBe(true);
      expect(isDelegationOperation("undelegate")).toBe(false);
      expect(isDelegationOperation("deposit")).toBe(false);
    });
  });

  describe("isUndelegateOperation", () => {
    it("returns true only for undelegate", () => {
      expect(isUndelegateOperation("undelegate")).toBe(true);
      expect(isUndelegateOperation("delegate")).toBe(false);
      expect(isUndelegateOperation("stake")).toBe(false);
    });
  });
});
