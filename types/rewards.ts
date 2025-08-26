import { AVS } from "./avs";
import { Token } from "./tokens";

export interface RewardResponse {
  rewards: Array<{
    avs_address: string;
    rewards: Array<{
      denom: string;
      amount: string;
    }>;
  }>;
}

export interface RewardsPerStakerId {
  userAddress: string;
  customChainId: number;
  rewards: Map<
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
  >;
}

export interface RewardsPerAVS {
  avs: AVS;
  tokens: Map<
    string,
    {
      token: Token;
      amount: bigint;
    }
  >;
}

export interface RewardsPerToken {
  token: Token;
  totalAmount: bigint;
  sources: Map<
    string,
    {
      avs: AVS;
      amount: bigint;
    }
  >;
}

export interface RewardsPerTokenWithValues {
  token: Token;
  totalAmount: bigint;
  totalValue: number;
  sources: Array<{
    avs: AVS;
    amount: bigint;
    value: number;
  }>;
}

export const imuaDenom = "hua";
