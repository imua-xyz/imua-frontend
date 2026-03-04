import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { validTokens } from "@/types/tokens";
import { StakingPositionPerToken } from "@/types/position";

const useStakerBalancesMock = vi.fn();
const getQueryStakerAddressMock = vi.fn();

vi.mock("@/hooks/useStakerBalances", () => ({
  useStakerBalances: (...args: any[]) => useStakerBalancesMock(...args),
}));

vi.mock("@/stores/allWalletsStore", () => ({
  getQueryStakerAddress: (...args: any[]) =>
    getQueryStakerAddressMock(...args),
}));

import { useStakingPositions } from "@/hooks/useStakingPositions";

describe("useStakingPositions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds positions map from staker balances", () => {
    const token = validTokens[0];

    // For this test, simulate only first token having a wallet; others none
    getQueryStakerAddressMock.mockImplementation((t: any) => {
      if (t === token) {
        return { queryAddress: "0xQuery", stakerAddress: "0xStaker" };
      }
      return { queryAddress: undefined, stakerAddress: undefined };
    });

    useStakerBalancesMock.mockReturnValue(
      validTokens.map((t, index) =>
        index === 0
          ? {
              data: {
                totalDeposited: BigInt(100),
                delegated: BigInt(40),
                withdrawable: BigInt(60),
              },
              isLoading: false,
              error: null,
            }
          : {
              data: undefined,
              isLoading: false,
              error: null,
            },
      ),
    );

    const { result } = renderHook(() => useStakingPositions());

    const key = `${token.network.customChainIdByImua}_${token.address.toLowerCase()}`;
    const entry = result.current.data.get(key);

    expect(entry?.isLoading).toBe(false);
    expect(entry?.error).toBeNull();
    expect(entry?.data).toEqual<StakingPositionPerToken>({
      token,
      stakerAddress: "0xStaker",
      totalDeposited: BigInt(100),
      delegated: BigInt(40),
      undelegated: BigInt(60),
    });
  });

  it("returns zeroed position when boundImuaAddressNotSetup", () => {
    const token = validTokens[0];

    getQueryStakerAddressMock.mockImplementation((t: any) => {
      if (t === token) {
        return { queryAddress: undefined, stakerAddress: "0xStaker" };
      }
      return { queryAddress: undefined, stakerAddress: undefined };
    });

    useStakerBalancesMock.mockReturnValue(
      validTokens.map(() => ({
        data: undefined,
        isLoading: false,
        error: null,
      })),
    );

    const { result } = renderHook(() => useStakingPositions());

    const key = `${token.network.customChainIdByImua}_${token.address.toLowerCase()}`;
    const entry = result.current.data.get(key);

    expect(entry?.data).toEqual<StakingPositionPerToken>({
      token,
      stakerAddress: "0xStaker",
      totalDeposited: BigInt(0),
      delegated: BigInt(0),
      undelegated: BigInt(0),
    });
    expect(entry?.isLoading).toBe(false);
    expect(entry?.error).toBeNull();
  });

  it("aggregates loading and error state across tokens", () => {
    getQueryStakerAddressMock.mockReturnValue({
      queryAddress: "0xQuery",
      stakerAddress: "0xStaker",
    });

    useStakerBalancesMock.mockReturnValue(
      validTokens.map((_, index) =>
        index === 0
          ? { data: undefined, isLoading: true, error: null }
          : index === 1
            ? {
                data: undefined,
                isLoading: false,
                error: new Error("failed"),
              }
            : { data: undefined, isLoading: false, error: null },
      ),
    );

    const { result } = renderHook(() => useStakingPositions());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("failed");
  });
});

