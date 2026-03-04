import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useOptimisticCacheCleanup } from "@/hooks/useOptimisticCacheCleanup";

const mockClearAll = vi.fn();
const mockClearByChainId = vi.fn();

vi.mock("@/stores/optimisticCacheStore", () => ({
  useOptimisticCacheStore: () => ({
    clearAll: mockClearAll,
    clearByChainId: mockClearByChainId,
  }),
}));

vi.mock("@/hooks/useBootstrapStatus", () => ({
  useBootstrapStatus: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
}));

function Component() {
  useOptimisticCacheCleanup();
  return null;
}

describe("useOptimisticCacheCleanup", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useBootstrapStatus } = await import("@/hooks/useBootstrapStatus");
    const { useAccount } = await import("wagmi");
    vi.mocked(useBootstrapStatus).mockReturnValue({
      bootstrapStatus: { isBootstrapped: false },
    } as any);
    vi.mocked(useAccount).mockReturnValue({ chain: { id: 1 } } as any);
  });

  it("calls clearAll when bootstrap status is bootstrapped", async () => {
    const { useBootstrapStatus } = await import("@/hooks/useBootstrapStatus");
    vi.mocked(useBootstrapStatus).mockReturnValue({
      bootstrapStatus: { isBootstrapped: true },
    } as any);
    render(<Component />);
    expect(mockClearAll).toHaveBeenCalled();
  });

  it("does not call clearAll when not bootstrapped", async () => {
    render(<Component />);
    expect(mockClearAll).not.toHaveBeenCalled();
  });
});
