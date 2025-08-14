import { Token } from "./tokens";

export interface StakingPositionPerToken {
  token: Token;
  stakerAddress: string;
  totalDeposited: bigint;
  delegated: bigint;
  undelegated: bigint;
}
