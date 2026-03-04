import { describe, it, expect } from "vitest";
import { generateStakerId, generateAssetId } from "@/lib/graphql/transformers";

describe("transformers", () => {
  describe("generateStakerId", () => {
    it("formats as address_0xchainId (lowercase address)", () => {
      expect(generateStakerId("0xAbc123", 1)).toBe("0xabc123_0x1");
      expect(generateStakerId("0xAbc123", 31337)).toBe("0xabc123_0x7a69");
    });
  });

  describe("generateAssetId", () => {
    it("formats as tokenAddress_0xchainId (lowercase address)", () => {
      expect(generateAssetId("0xToken456", 1)).toBe("0xtoken456_0x1");
      expect(generateAssetId("0xToken456", 31337)).toBe("0xtoken456_0x7a69");
    });
  });
});
