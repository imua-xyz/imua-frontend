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
  rewards: Array<{
    avs: AVS;
    tokens: Array<{
      token: Token;
      amount: bigint;
    }>;
  }>;
}

export interface RewardsByAVS {
  avs: AVS;
  tokens: Array<{
    token: Token;
    amount: bigint;
  }>;
}

export interface RewardsByToken {
  token: Token;
  totalAmount: bigint;
  sources: Array<{
    avs: AVS;
    amount: bigint;
  }>;
}

export interface RewardsWithValues {
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
