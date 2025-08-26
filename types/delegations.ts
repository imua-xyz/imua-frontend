import { Token } from "./tokens";

export interface DelegationsResponse {
  delegation_infos: Array<{
    operator: string;
    delegation_info: {
      delegation_amounts: {
        undelegatable_share: string;
        wait_undelegation_amount: string;
      };
      max_undelegatable_amount: string;
    };
  }>;
}

export interface DelegationPerOperator {
  operatorAddress: string;
  operatorName: string | undefined;
  delegated: bigint;
  unbonding: bigint;
}

export interface DelegationsPerToken {
  token: Token;
  userAddress: string;
  delegationsByOperator: Map<string, DelegationPerOperator>; // operator address -> delegation info
}
