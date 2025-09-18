import { BootstrapValidator, BootstrapDelegationState } from "./schema";
import { OperatorInfo } from "@/types/operator";
import {
  DelegationPerOperator,
  DelegationsPerToken,
} from "@/types/delegations";
import { Token } from "@/types/tokens";

/**
 * Transform GraphQL BootstrapValidator to OperatorInfo
 */
export function transformBootstrapValidatorToOperatorInfo(
  validator: BootstrapValidator,
): OperatorInfo {
  return {
    address: validator.validator_im_addr,
    commission: {
      commission_rates: {
        rate: validator.commission_rate.toString(),
        max_rate: validator.max_commission_rate.toString(),
        max_change_rate: validator.max_change_rate.toString(),
      },
      update_time: validator.updated_at || "",
    },
    earnings_addr: "",
    approve_addr: "",
    operator_meta_info: validator.validator_name,
    client_chain_earnings_addr: { earning_info_list: [] },
    // No APR during bootstrap phase
    apr: 0,
  };
}

/**
 * Transform GraphQL BootstrapDelegationState to DelegationPerOperator
 */
export function transformBootstrapDelegationToDelegationPerOperator(
  delegation: BootstrapDelegationState,
  operators: OperatorInfo[] = [],
): DelegationPerOperator {
  // Find the operator name from the operators list
  const operator = operators.find(
    (op) => op.address.toLowerCase() === delegation.operator_addr.toLowerCase(),
  );

  return {
    operatorAddress: delegation.operator_addr,
    operatorName: operator?.operator_meta_info || "Unknown Operator",
    delegated: BigInt(delegation.delegated),
    unbonding: BigInt(0), // No unbonding during bootstrap phase
  };
}

/**
 * Transform GraphQL data to DelegationsPerToken
 */
export function transformBootstrapDelegationsToDelegationsPerToken(
  delegations: BootstrapDelegationState[],
  token: Token,
  stakerAddress: string,
  operators: OperatorInfo[] = [],
): DelegationsPerToken {
  const delegationsByOperator = new Map<string, DelegationPerOperator>();

  delegations.forEach((delegation) => {
    if (delegation.delegated > 0) {
      const delegationPerOperator =
        transformBootstrapDelegationToDelegationPerOperator(
          delegation,
          operators,
        );
      delegationsByOperator.set(
        delegation.operator_addr.toLowerCase(),
        delegationPerOperator,
      );
    }
  });

  return {
    token,
    userAddress: stakerAddress,
    delegationsByOperator,
  };
}

/**
 * Filter delegations by asset ID
 */
export function filterDelegationsByAsset(
  delegations: BootstrapDelegationState[],
  assetId: string,
): BootstrapDelegationState[] {
  return delegations.filter((delegation) => delegation.asset_id === assetId);
}

/**
 * Generate staker ID from address and chain ID
 */
export function generateStakerId(address: string, chainId: number): string {
  return `${address.toLowerCase()}_0x${chainId.toString(16)}`;
}

/**
 * Generate asset ID from token address and chain ID
 */
export function generateAssetId(tokenAddress: string, chainId: number): string {
  return `${tokenAddress.toLowerCase()}_0x${chainId.toString(16)}`;
}

/**
 * Sort operators by commission rate (ascending)
 */
export function sortOperatorsByCommissionRate(
  operators: OperatorInfo[],
): OperatorInfo[] {
  return operators.sort(
    (a, b) =>
      Number(a.commission.commission_rates.rate) -
      Number(b.commission.commission_rates.rate),
  );
}
