import { useQueries } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { COSMOS_CONFIG } from "@/config/cosmos";
import {
  validTokens,
  Token,
  getTokenKey,
  getTokenBySymbol,
  getTokenByKey,
} from "@/types/tokens";
import { RewardResponse, RewardsPerStakerId } from "@/types/rewards";
import { useAllWalletsStore } from "@/stores/allWalletsStore";
import { RewardsPerAVS, RewardsPerToken } from "@/types/rewards";
import { AVS, findKnownAVSByAddress, createUnknownAVS } from "@/types/avs";

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

async function fetchRewards(
  userAddress: string,
  customChainId: number,
): Promise<RewardsPerStakerId> {
  if (!userAddress || !customChainId) {
    throw new Error("Invalid parameters");
  }

  // Cosmos RPC: /imuachain/feedistribution/v1/unclaimed_rewards/{stakerId}
  const stakerId = `${userAddress.toLowerCase()}_0x${customChainId.toString(16)}`;
  const url = `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.REWARDS(stakerId)}`;
  const data = (await fetch(url).then((r) => r.json())) as RewardResponse;

  // Group rewards by AVS address and token
  // Map<avsAddress, Map<tokenKey, totalAmount>>
  const rewardsByAvs = new Map<string, Map<string, bigint>>();

  data.rewards.forEach((avsReward) => {
    const avsAddress = avsReward.avs_address;

    // Get or create the token amounts map for this AVS
    let tokenAmounts = rewardsByAvs.get(avsAddress);

    // Aggregate all rewards for this AVS entry first
    const newTokenAmounts = new Map<string, bigint>();
    avsReward.rewards.forEach((reward) => {
      const token = getTokenBySymbol(reward.denom);
      if (token) {
        const tokenKey = getTokenKey(token);
        const existingAmount = newTokenAmounts.get(tokenKey) || BigInt(0);
        const newAmount = existingAmount + BigInt(parseInt(reward.amount));
        newTokenAmounts.set(tokenKey, newAmount);
      }
    });

    if (tokenAmounts) {
      // Merge new aggregated amounts with existing amounts
      newTokenAmounts.forEach((amount, tokenKey) => {
        const existingAmount = tokenAmounts.get(tokenKey) || BigInt(0);
        tokenAmounts.set(tokenKey, existingAmount + amount);
      });
    } else {
      // First time seeing this AVS, set the aggregated amounts
      rewardsByAvs.set(avsAddress, newTokenAmounts);
    }
  });

  // Create the rewards map as defined in RewardsPerStakerId
  const rewards = new Map<
    string,
    {
      avs: AVS;
      tokens: Map<
        string,
        {
          token: Token;
          amount: bigint;
        }
      >;
    }
  >();

  rewardsByAvs.forEach((tokenAmounts, avsAddress) => {
    // Find the AVS object by address, or create an unknown AVS if not found
    let avs: AVS =
      findKnownAVSByAddress(avsAddress) || createUnknownAVS(avsAddress);

    // Create the tokens map for this AVS
    const tokens = new Map<
      string,
      {
        token: Token;
        amount: bigint;
      }
    >();

    // Add each token with its aggregated amount
    tokenAmounts.forEach((amount, tokenKey) => {
      // Get the token by token key to make this generic
      const token = getTokenByKey(tokenKey);
      if (token) {
        tokens.set(tokenKey, {
          token: token,
          amount: amount,
        });
      }
    });

    rewards.set(avsAddress, {
      avs,
      tokens,
    });
  });

  return {
    userAddress: userAddress,
    customChainId: customChainId,
    rewards,
  };
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
  // Always call useQuery, but control execution with enabled option
  const query = useQuery({
    queryKey: ["rewards", userAddress, customChainId],
    queryFn: async (): Promise<RewardsPerStakerId> => {
      return fetchRewards(userAddress, customChainId);
    },
    enabled: !!userAddress && !!customChainId,
    refetchInterval: 30000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useAllRewards(): {
  data: {
    rewardsByAvs: Map<string, RewardsPerAVS | undefined>;
    rewardsByToken: Map<string, RewardsPerToken | undefined>;
  };
  isLoading: boolean;
  error: Error | null;
} {
  const uniqueStakerIds = getUniqueStakerIds();

  // Create queries for all unique staker IDs
  const queries = uniqueStakerIds.map(({ userAddress, customChainId }) => ({
    queryKey: ["rewards", userAddress, customChainId],
    queryFn: async (): Promise<RewardsPerStakerId> => {
      return fetchRewards(userAddress, customChainId);
    },
    enabled: !!userAddress && !!customChainId,
    refetchInterval: 30000,
  }));

  const results = useQueries({ queries });
  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r && r.error)?.error || undefined;

  // Aggregate rewards by AVS across all stakerIds
  const rewardsByAvs = new Map<string, RewardsPerAVS | undefined>();

  results.forEach((result) => {
    if (result.data) {
      result.data.rewards.forEach((reward) => {
        const avsKey = reward.avs.address;
        const existing = rewardsByAvs.get(avsKey);

        if (existing) {
          // Merge tokens for the same AVS
          reward.tokens.forEach((newToken) => {
            // Use token key for the tokens map
            const tokenKey = getTokenKey(newToken.token);
            const existingToken = existing.tokens.get(tokenKey);

            if (existingToken) {
              // Add amounts for the same token
              existing.tokens.set(tokenKey, {
                token: newToken.token,
                amount: existingToken.amount + newToken.amount,
              });
            } else {
              // Add new token
              existing.tokens.set(tokenKey, newToken);
            }
          });
        } else {
          // First time seeing this AVS
          rewardsByAvs.set(avsKey, {
            avs: reward.avs,
            tokens: new Map<string, { token: Token; amount: bigint }>(
              Array.from(reward.tokens.entries()),
            ),
          });
        }
      });
    }
  });

  // Group rewards by token (final step for dashboard display)
  const rewardsByToken = new Map<string, RewardsPerToken>();

  Array.from(rewardsByAvs.values())
    .filter((avsReward): avsReward is RewardsPerAVS => avsReward !== undefined)
    .forEach((avsReward) => {
      avsReward.tokens.forEach((tokenReward) => {
        // Use token ID (address + custom chain ID) as key for uniqueness
        const tokenKey = getTokenKey(tokenReward.token);
        const existing = rewardsByToken.get(tokenKey);

        if (existing) {
          // Add amounts for the same token
          existing.totalAmount += tokenReward.amount;
          existing.sources.set(avsReward.avs.address, {
            avs: avsReward.avs,
            amount: tokenReward.amount,
          });
        } else {
          // First time seeing this token
          rewardsByToken.set(tokenKey, {
            token: tokenReward.token,
            totalAmount: tokenReward.amount,
            sources: new Map<
              string,
              {
                avs: AVS;
                amount: bigint;
              }
            >([
              [
                avsReward.avs.address,
                {
                  avs: avsReward.avs,
                  amount: tokenReward.amount,
                },
              ],
            ]),
          });
        }
      });
    });

  return {
    data: {
      rewardsByAvs, // AVS-grouped rewards (Map)
      rewardsByToken, // Token-grouped rewards (Map)
    },
    isLoading,
    error: error || null,
  };
}
