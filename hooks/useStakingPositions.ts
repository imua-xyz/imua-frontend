import { useAllWalletsStore } from "@/stores/allWalletsStore";
import { validTokens } from "@/types/tokens";
import { StakingPosition } from "@/types/position";
import { useStakerBalances, StakerBalanceQuery } from "./useStakerBalances";

export function useStakingPositions(): {
  positions: Array<{
    position: StakingPosition | undefined;
    isLoading: boolean;
    error: Error | null;
  }>;
  isLoading: boolean;
  error: Error | null;
} {
  const wallets = useAllWalletsStore((s) => s.wallets);
  const stakerBalanceQueries: StakerBalanceQuery[] = validTokens.map((token) => ({
    userAddress: wallets[token.network.customChainIdByImua]?.address as `0x${string}`,
    endpointId: token.network.customChainIdByImua,
    tokenAddress: token.address,
  }));

  const results = useStakerBalances(stakerBalanceQueries);

  // Transform results to match the expected format
  const positions = results.map((result, index) => {
    const token = validTokens[index];
    const wallet = wallets[token.network.customChainIdByImua];

    let stakerAddress: string | undefined = undefined;
    let shouldFetch = false;

    if (wallet) {
      if (token.connector.requireExtraConnectToImua) {
        if (wallet.boundImuaAddress) {
          stakerAddress = wallet.boundImuaAddress;
          shouldFetch = true;
        } else if (wallet.address) {
          stakerAddress = wallet.address;
          shouldFetch = false;
        }
      } else {
        stakerAddress = wallet.address;
        shouldFetch = true;
      }
    }

    // Handle the logic conditionally
    if (!shouldFetch || !stakerAddress) {
      if (
        wallet &&
        token.connector.requireExtraConnectToImua &&
        wallet.address &&
        !wallet.boundImuaAddress
      ) {
        // User has not bound an imua address yet, show zero balance
        return {
          position: {
            token,
            stakerAddress: wallet.address,
            data: {
              totalDeposited: BigInt(0),
              delegated: BigInt(0),
              undelegated: BigInt(0),
            },
          },
          isLoading: false,
          error: null,
        };
      } else {
        // No wallet connected for this token
        return {
          position: undefined,
          isLoading: false,
          error: null,
        };
      }
    }

    return {
      position: result.data
        ? {
            token,
            stakerAddress,
            data: {
              totalDeposited: result.data?.totalDeposited || BigInt(0),
              delegated: result.data?.delegated || BigInt(0),
              undelegated: result.data?.withdrawable || BigInt(0),
            },
          }
        : undefined,
      isLoading: result.isLoading,
      error: result.error,
    };
  });

  const isLoading = positions.some((p) => p.isLoading);
  const error = positions.find((p) => p && p.error)?.error || null;

  return {
    positions,
    isLoading,
    error,
  };
}
