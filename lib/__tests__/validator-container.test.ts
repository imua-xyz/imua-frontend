import { describe, it, expect } from "vitest";
import {
  getEffectiveBalanceGwei,
  getDepositAmountWeiFromValidatorContainer,
} from "@/lib/validator-container";

/**
 * Build a bytes32 hex string with the high 8 bytes (16 hex chars) set to little-endian uint64.
 * ValidatorContainer index 2 stores effective_balance as little-endian uint64 in the first 8 bytes.
 */
function bytes32FromLittleEndianUint64(value: bigint): `0x${string}` {
  const hex = value.toString(16).padStart(16, "0");
  const bytes = hex.match(/.{2}/g)!;
  const le = bytes.reverse().join("");
  return `0x${le.padEnd(64, "0")}` as `0x${string}`;
}

describe("validator-container", () => {
  describe("getEffectiveBalanceGwei", () => {
    it("reads effective balance from index 2 (little-endian uint64)", () => {
      const gwei = 32_000_000_000n; // 32 ETH in Gwei
      const container: `0x${string}`[] = [
        "0x" + "00".repeat(32),
        "0x" + "00".repeat(32),
        bytes32FromLittleEndianUint64(gwei),
        "0x" + "00".repeat(32),
        "0x" + "00".repeat(32),
        "0x" + "00".repeat(32),
        "0x" + "00".repeat(32),
        "0x" + "00".repeat(32),
      ];
      expect(getEffectiveBalanceGwei(container)).toBe(gwei);
    });

    it("throws when container length is too short", () => {
      expect(() => getEffectiveBalanceGwei(["0x" + "00".repeat(64)])).toThrow(
        "ValidatorContainer: invalid length",
      );
    });
  });

  describe("getDepositAmountWeiFromValidatorContainer", () => {
    it("converts Gwei to wei (effective_balance_gwei * 1e9)", () => {
      const gwei = 32_000_000_000n; // 32 ETH
      const container: `0x${string}`[] = [
        "0x" + "00".repeat(32),
        "0x" + "00".repeat(32),
        bytes32FromLittleEndianUint64(gwei),
        "0x" + "00".repeat(32),
        "0x" + "00".repeat(32),
        "0x" + "00".repeat(32),
        "0x" + "00".repeat(32),
        "0x" + "00".repeat(32),
      ];
      const wei = getDepositAmountWeiFromValidatorContainer(container);
      expect(wei).toBe(32_000_000_000n * 10n ** 9n);
    });
  });
});
