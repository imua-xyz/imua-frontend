import { getQueryStakerAddress } from "@/stores/allWalletsStore";
import { validTokens, getTokenKey } from "@/types/tokens";
import { StakingPositionPerToken } from "@/types/position";
import { useStakerBalances } from "./useStakerBalances";

export function useStakingPositions(): {
  data: Map<
    string,
    {
      data: StakingPositionPerToken | undefined;
      isLoading: boolean;
      error: Error | null;
    }
  >;
  isLoading: boolean;
  error: Error | null;
} {
  const results = useStakerBalances(validTokens);

  const positions = new Map<
    string,
    {
      data: StakingPositionPerToken | undefined;
      isLoading: boolean;
      error: Error | null;
    }
  >();

  // Transform results to match the expected format
  results.forEach((result, index) => {
    const token = validTokens[index];
    const { queryAddress, stakerAddress } = getQueryStakerAddress(token);
    const boundImuaAddressNotSetup = stakerAddress && !queryAddress;

    let position: StakingPositionPerToken | undefined = undefined;
    let isLoading: boolean = false;
    let error: Error | null = null;
    if (boundImuaAddressNotSetup) {
      position = {
        token,
        stakerAddress,
        totalDeposited: BigInt(0),
        delegated: BigInt(0),
        undelegated: BigInt(0),
      };
      isLoading = false;
      error = null;
    } else if (result.data) {
      position = {
        token,
        stakerAddress: stakerAddress!,
        totalDeposited: result.data.totalDeposited,
        delegated: result.data.delegated,
        undelegated: result.data.withdrawable,
      };
      isLoading = result.isLoading;
      error = result.error;
    } else {
      position = undefined;
      isLoading = result.isLoading;
      error = result.error;
    }

    positions.set(getTokenKey(token), {
      data: position,
      isLoading,
      error,
    });
  });

  const isLoading = Array.from(positions.values()).some((p) => p.isLoading);
  const error =
    Array.from(positions.values()).find((p) => p && p.error)?.error || null;

  return {
    data: positions,
    isLoading,
    error,
  };
}
