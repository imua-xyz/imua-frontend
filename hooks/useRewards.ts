import { useQueries } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { COSMOS_CONFIG } from "@/config/cosmos";
import { validTokens, Token, imua } from "@/types/tokens";
import { RewardResponse, RewardsPerStakerId } from "@/types/rewards";
import { useAllWalletsStore } from "@/stores/allWalletsStore";
import { imuaDenom, RewardsByAVS, RewardsByToken } from "@/types/rewards";
import { AVS, validAVS } from "@/types/avs";

// Helper function to get unique stakerIds from validTokens and connected wallets
function getUniqueStakerIds(): Array<{
  userAddress: string;
  customChainId: number;
}> {
  const wallets = useAllWalletsStore.getState().wallets;
  const uniqueStakerIds = new Map<
    string,
    { userAddress: string; customChainId: number }
  >();

  validTokens.forEach((token) => {
    const wallet = wallets[token.network.customChainIdByImua];
    if (wallet) {
      let stakerAddress: string | undefined = undefined;
      if (token.connector.requireExtraConnectToImua) {
        if (wallet.boundImuaAddress) {
          stakerAddress = wallet.boundImuaAddress;
        } else if (wallet.address) {
          // User has not bound an imua address yet, skip
          return;
        } else {
          return;
        }
      } else {
        stakerAddress = wallet.address;
      }

      if (stakerAddress) {
        const customChainId = token.network.customChainIdByImua;
        const stakerId = `${stakerAddress.toLowerCase()}_0x${customChainId.toString(16)}`;
        uniqueStakerIds.set(stakerId, {
          userAddress: stakerAddress,
          customChainId,
        });
      }
    }
  });

  return Array.from(uniqueStakerIds.values());
}

// Helper function to find AVS by address
function findAVSByAddress(avsAddress: string): AVS | undefined {
  return validAVS.find(
    (avs) => avs.address.toLowerCase() === avsAddress.toLowerCase(),
  );
}

// If no staker address, returns { data: undefined, isLoading: false, error: null, ... }
export function useRewardsPerStakerId(
  userAddress: string,
  customChainId: number,
): {
  data: RewardsPerStakerId | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  if (!userAddress || !customChainId) {
    // No valid parameters, return empty rewards
    return {
      data: undefined,
      isLoading: false,
      error: null,
    };
  }

  return useQuery({
    queryKey: ["rewards", userAddress, customChainId],
    queryFn: async (): Promise<RewardsPerStakerId> => {
      // Cosmos RPC: /imuachain/feedistribution/v1/unclaimed_rewards/{stakerId}
      const stakerId = `${userAddress.toLowerCase()}_0x${customChainId.toString(16)}`;
      const url = `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.REWARDS(stakerId)}`;
      const data = (await fetch(url).then((r) => r.json())) as RewardResponse;

      // Group rewards by AVS address and filter for IMUA token (hua denom)
      const rewardsByAvs = new Map<string, string>();

      data.rewards.forEach((avsReward) => {
        avsReward.rewards.forEach((reward) => {
          if (reward.denom === imuaDenom) {
            // If this AVS already has rewards, add to existing amount
            const existingAmount = rewardsByAvs.get(avsReward.avs_address);
            if (existingAmount) {
              const newAmount = (
                BigInt(parseInt(existingAmount)) +
                BigInt(parseInt(reward.amount))
              ).toString();
              rewardsByAvs.set(avsReward.avs_address, newAmount);
            } else {
              rewardsByAvs.set(avsReward.avs_address, reward.amount);
            }
          }
        });
      });

      return {
        userAddress: userAddress,
        customChainId: customChainId,
        rewards: Array.from(rewardsByAvs.entries())
          .map(([avsAddress, amount]) => {
            // Find the AVS object by address
            const avs = findAVSByAddress(avsAddress);
            if (!avs) {
              // Skip if we don't have AVS info for this address
              return null;
            }

            return {
              avs,
              tokens: [
                {
                  token: imua,
                  amount: BigInt(parseInt(amount)),
                },
              ],
            };
          })
          .filter(Boolean) as Array<{
          avs: AVS;
          tokens: Array<{
            token: Token;
            amount: bigint;
          }>;
        }>,
      };
    },
    enabled: !!userAddress && !!customChainId,
    refetchInterval: 30000,
  });
}

export function useAllRewards() {
  const uniqueStakerIds = getUniqueStakerIds();

  // Create queries for all unique staker IDs
  const queries = uniqueStakerIds.map(({ userAddress, customChainId }) => ({
    queryKey: ["rewards", userAddress, customChainId],
    queryFn: async (): Promise<RewardsPerStakerId> => {
      if (!userAddress || !customChainId) {
        return {
          userAddress: userAddress,
          customChainId: customChainId,
          rewards: [],
        };
      }

      // Cosmos RPC: /imuachain/feedistribution/v1/unclaimed_rewards/{stakerId}
      const stakerId = `${userAddress.toLowerCase()}_0x${customChainId.toString(16)}`;
      const url = `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.REWARDS(stakerId)}`;
      const data = (await fetch(url).then((r) => r.json())) as RewardResponse;

      // Group rewards by AVS address and filter for IMUA token (hua denom)
      const rewardsByAvs = new Map<string, string>();

      data.rewards.forEach((avsReward) => {
        avsReward.rewards.forEach((reward) => {
          if (reward.denom === imuaDenom) {
            // If this AVS already has rewards, add to existing amount
            const existingAmount = rewardsByAvs.get(avsReward.avs_address);
            if (existingAmount) {
              const newAmount = (
                BigInt(parseInt(existingAmount)) +
                BigInt(parseInt(reward.amount))
              ).toString();
              rewardsByAvs.set(avsReward.avs_address, newAmount);
            } else {
              rewardsByAvs.set(avsReward.avs_address, reward.amount);
            }
          }
        });
      });

      return {
        userAddress: userAddress,
        customChainId: customChainId,
        rewards: Array.from(rewardsByAvs.entries())
          .map(([avsAddress, amount]) => {
            // Find the AVS object by address
            const avs = findAVSByAddress(avsAddress);
            if (!avs) {
              // Skip if we don't have AVS info for this address
              return null;
            }

            return {
              avs,
              tokens: [
                {
                  token: imua,
                  amount: BigInt(parseInt(amount)),
                },
              ],
            };
          })
          .filter(Boolean) as Array<{
          avs: AVS;
          tokens: Array<{
            token: Token;
            amount: bigint;
          }>;
        }>,
      };
    },
    enabled: !!userAddress && !!customChainId,
    refetchInterval: 30000,
  }));

  const results = useQueries({ queries });
  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r && r.error)?.error || undefined;

  // Aggregate rewards by AVS across all stakerIds
  const rewardsByAvs = new Map<string, RewardsByAVS>();

  results.forEach((result) => {
    if (result.data) {
      result.data.rewards.forEach((reward) => {
        const avsKey = reward.avs.address;
        const existing = rewardsByAvs.get(avsKey);

        if (existing) {
          // Merge tokens for the same AVS
          reward.tokens.forEach((newToken) => {
            const existingTokenIndex = existing.tokens.findIndex(
              (t) => t.token.address === newToken.token.address,
            );
            if (existingTokenIndex >= 0) {
              // Add amounts for the same token
              existing.tokens[existingTokenIndex].amount += newToken.amount;
            } else {
              // Add new token
              existing.tokens.push(newToken);
            }
          });
        } else {
          // First time seeing this AVS
          rewardsByAvs.set(avsKey, {
            avs: reward.avs,
            tokens: reward.tokens,
          });
        }
      });
    }
  });

  // Group rewards by token (final step for dashboard display)
  const rewardsByToken = new Map<string, RewardsByToken>();

  Array.from(rewardsByAvs.values()).forEach((avsReward) => {
    avsReward.tokens.forEach((tokenReward) => {
      // Use token ID (address + custom chain ID) as key for uniqueness
      const tokenKey = `${tokenReward.token.address.toLowerCase()}_0x${tokenReward.token.network.customChainIdByImua.toString(16)}`;
      const existing = rewardsByToken.get(tokenKey);

      if (existing) {
        // Add amounts for the same token
        existing.totalAmount += tokenReward.amount;
        existing.sources.push({
          avs: avsReward.avs,
          amount: tokenReward.amount,
        });
      } else {
        // First time seeing this token
        rewardsByToken.set(tokenKey, {
          token: tokenReward.token,
          totalAmount: tokenReward.amount,
          sources: [
            {
              avs: avsReward.avs,
              amount: tokenReward.amount,
            },
          ],
        });
      }
    });
  });

  return {
    rewardsByAvs: Array.from(rewardsByAvs.values()), // AVS-grouped rewards
    rewardsByToken: Array.from(rewardsByToken.values()), // Token-grouped rewards
    isLoading,
    error,
  };
}
