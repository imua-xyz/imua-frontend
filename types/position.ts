import { Token } from "./tokens";
import { StakerBalanceResponseFromPrecompile } from "./staking";

export interface StakingPosition {
  token: Token;
  stakerAddress: string;
  data: {
    totalDeposited: bigint;
    delegated: bigint;
    undelegated: bigint;
  };
}
