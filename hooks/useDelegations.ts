import { useQueries, UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { COSMOS_CONFIG } from "@/config/cosmos";
import { validTokens, Token, getTokenKey } from "@/types/tokens";
import {
  DelegationsPerToken,
  DelegationsResponse,
  DelegationPerOperator,
} from "@/types/delegations";
import { getQueryStakerAddress } from "@/stores/allWalletsStore";
import { useOperators } from "./useOperators";

// If no staker address, returns { data: undefined, isLoading: false, error: null, ... }
export function useDelegations(
  token: Token,
): UseQueryResult<DelegationsPerToken, Error> {
  const { data: operators } = useOperators();
  const { queryAddress, stakerAddress } = getQueryStakerAddress(token);

  const customChainId = token.network.customChainIdByImua;

  // Always call useQuery, but control execution with enabled option
  const query = useQuery({
    queryKey: ["delegations", queryAddress, token.address, customChainId],
    queryFn: async (): Promise<DelegationsPerToken> => {
      if (!queryAddress) {
        throw new Error("No staker address available");
      }

      // Cosmos RPC: /imuachain/delegation/v1/delegations/{stakerId}/{assetId}
      const stakerId = `${queryAddress.toLowerCase()}_0x${customChainId.toString(16)}`;
      const assetId = `${token.address.toLowerCase()}_0x${customChainId.toString(16)}`;
      const url = `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.DELEGATION_INFO(stakerId, assetId)}`;
      const data = (await fetch(url).then((r) =>
        r.json(),
      )) as DelegationsResponse;
      const infos = data.delegation_infos || [];

      // Convert to Map for O(1) lookups by operator address
      const delegationsByOperator = new Map<string, DelegationPerOperator>();
      infos.forEach((item) => {
        delegationsByOperator.set(item.operator.toLowerCase(), {
          operatorAddress: item.operator,
          operatorName: operators?.find(
            (op) => op.address.toLowerCase() === item.operator.toLowerCase(),
          )?.operator_meta_info,
          delegated: BigInt(item.delegation_info.max_undelegatable_amount),
          unbonding: BigInt(
            item.delegation_info.delegation_amounts.wait_undelegation_amount,
          ),
        });
      });

      return {
        token,
        userAddress: stakerAddress!,
        delegationsByOperator,
      };
    },
    enabled: !!queryAddress && !!token.address && !!customChainId,
    refetchInterval: 3000,
  });

  return query;
}

export function useAllDelegations(): {
  data: Map<
    string,
    {
      data: DelegationsPerToken | undefined;
      isLoading: boolean;
      error: Error | null;
    }
  >;
  isLoading: boolean;
  error: Error | null;
} {
  const { data: operators } = useOperators();

  // Create queries for all tokens
  const queries = validTokens.map((token) => {
    const { queryAddress, stakerAddress } = getQueryStakerAddress(token);

    return {
      queryKey: [
        "delegations",
        queryAddress,
        token.address,
        token.network.customChainIdByImua,
      ],
      queryFn: async (): Promise<DelegationsPerToken> => {
        if (!queryAddress) {
          throw new Error("No staker address available");
        }

        const customChainId = token.network.customChainIdByImua;
        // Cosmos RPC: /imuachain/delegation/v1/delegations/{stakerId}/{assetId}
        const stakerId = `${queryAddress.toLowerCase()}_0x${customChainId.toString(16)}`;
        const assetId = `${token.address.toLowerCase()}_0x${customChainId.toString(16)}`;
        const url = `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.DELEGATION_INFO(stakerId, assetId)}`;
        const data = (await fetch(url).then((r) =>
          r.json(),
        )) as DelegationsResponse;
        const infos = data.delegation_infos || [];

        // Convert to Map for O(1) lookups by operator address
        const delegationsByOperator = new Map<string, DelegationPerOperator>();
        infos.forEach((item) => {
          delegationsByOperator.set(item.operator.toLowerCase(), {
            operatorAddress: item.operator,
            operatorName: operators?.find(
              (op) => op.address.toLowerCase() === item.operator.toLowerCase(),
            )?.operator_meta_info,
            delegated: BigInt(item.delegation_info.max_undelegatable_amount),
            unbonding: BigInt(
              item.delegation_info.delegation_amounts.wait_undelegation_amount,
            ),
          });
        });

        return {
          token,
          userAddress: stakerAddress!,
          delegationsByOperator,
        };
      },
      enabled:
        !!queryAddress &&
        !!token.address &&
        !!token.network.customChainIdByImua,
      refetchInterval: 3000,
    };
  });

  const results = useQueries({ queries });

  // Convert results to Map for O(1) lookups by token
  const delegationsByToken = new Map<
    string,
    {
      data: DelegationsPerToken | undefined;
      isLoading: boolean;
      error: Error | null;
    }
  >();

  // Results are ordered by validTokens, so direct iteration is cleanest
  results.forEach((result, index) => {
    const token = validTokens[index]; // Get corresponding token
    const tokenKey = getTokenKey(token);

    delegationsByToken.set(tokenKey, {
      data: result.data,
      isLoading: result.isLoading,
      error: result.error,
    });
  });

  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r && r.error)?.error || null;

  // Return the simplified structure
  return {
    data: delegationsByToken,
    isLoading,
    error,
  };
}
