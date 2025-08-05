import { useQueries } from "@tanstack/react-query";
import { useAllWalletsStore } from "@/stores/allWalletsStore";
import { validTokens, Token } from "@/types/tokens";
import { useAssetsPrecompile } from "./useAssetsPrecompile";
import { StakingPosition } from "@/types/position";
import { StakerBalanceResponseFromPrecompile } from "@/types/staking";

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
  const { getStakerBalanceByToken } = useAssetsPrecompile();

  // Create queries for all tokens
  const queries = validTokens.map((token) => {
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

    return {
      queryKey: [
        "stakerBalanceByToken",
        stakerAddress,
        token.network.customChainIdByImua,
        token.address,
      ],
      queryFn: async (): Promise<StakerBalanceResponseFromPrecompile> => {
        if (!shouldFetch || !stakerAddress) {
          // Return default values for non-fetchable cases
          return {
            clientChainID: token.network.customChainIdByImua,
            stakerAddress:
              (stakerAddress as `0x${string}`) ||
              "0x0000000000000000000000000000000000000000",
            tokenID: token.address,
            balance: BigInt(0),
            withdrawable: BigInt(0),
            delegated: BigInt(0),
            pendingUndelegated: BigInt(0),
            totalDeposited: BigInt(0),
          };
        }

        const { success, stakerBalanceResponse } =
          await getStakerBalanceByToken(
            stakerAddress as `0x${string}`,
            token.network.customChainIdByImua,
            token.address,
          );

        if (!success || !stakerBalanceResponse) {
          return {
            clientChainID: token.network.customChainIdByImua,
            stakerAddress: stakerAddress as `0x${string}`,
            tokenID: token.address,
            balance: BigInt(0),
            withdrawable: BigInt(0),
            delegated: BigInt(0),
            pendingUndelegated: BigInt(0),
            totalDeposited: BigInt(0),
          };
        }

        return stakerBalanceResponse as StakerBalanceResponseFromPrecompile;
      },
      enabled: !!stakerAddress,
      refetchInterval: 30000,
    };
  });

  const results = useQueries({ queries });

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
