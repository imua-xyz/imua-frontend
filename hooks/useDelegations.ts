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
import { useBootstrapStatus } from "./useBootstrapStatus";
import { useBootstrap } from "./useBootstrap";
import { useBootstrapDelegationsGraphQL } from "./useBootstrapGraphQL";
import { hoodi } from "@/types/networks";

// Helper function to fetch delegations from Bootstrap contract for a user
async function fetchBootstrapDelegations(
  contract: any,
  userAddress: string,
  tokenAddress: string,
  operators: any[],
): Promise<Map<string, DelegationPerOperator>> {
  if (operators && operators.length > 0) {
    const delegationsByOperator = new Map<string, DelegationPerOperator>();
    // Iterate over all operators to get user's delegations
    await Promise.all(
      operators.map(async (operator) => {
        try {
          // Get delegation amount for this user, validator, and token
          const delegationAmount = (await contract.read.delegations([
            userAddress as `0x${string}`,
            operator.address,
            tokenAddress as `0x${string}`,
          ])) as bigint;

          if (delegationAmount > BigInt(0)) {
            delegationsByOperator.set(operator.address.toLowerCase(), {
              operatorAddress: operator.address,
              operatorName: operator.operator_meta_info,
              delegated: delegationAmount,
              unbonding: BigInt(0), // No unbonding during bootstrap phase
            });
          }
        } catch (error) {
          console.error(
            `Failed to fetch delegation for operator ${operator.address}:`,
            error,
          );
          throw error;
        }
      }),
    );

    return delegationsByOperator;
  } else {
    throw new Error("No operators available");
  }
}

// If no staker address, returns { data: undefined, isLoading: false, error: null, ... }
export function useDelegations(
  token: Token,
): UseQueryResult<DelegationsPerToken, Error> {
  const { data: operators } = useOperators();
  const { queryAddress, stakerAddress } = getQueryStakerAddress(token);
  const { bootstrapStatus } = useBootstrapStatus();
  const bootstrap = useBootstrap(hoodi);

  const customChainId = token.network.customChainIdByImua;

  // Use GraphQL for bootstrap phase if available
  const graphqlDelegations = useBootstrapDelegationsGraphQL(
    queryAddress || "",
    token,
  );

  // Always call useQuery, but control execution with enabled option
  const query = useQuery({
    queryKey: [
      "delegations",
      queryAddress,
      token.address,
      customChainId,
      bootstrapStatus?.isBootstrapped,
    ],
    queryFn: async (): Promise<DelegationsPerToken> => {
      if (!queryAddress) {
        throw new Error("No staker address available");
      }

      // Post-bootstrap: fetch from Imuachain (Cosmos API)
      if (bootstrapStatus?.isBootstrapped) {
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
      }

      // Bootstrap phase: Try GraphQL first, fallback to contract
      if (!bootstrapStatus?.isBootstrapped) {
        // Return GraphQL data if available
        if (graphqlDelegations.data) {
          return graphqlDelegations.data;
        }

        // If GraphQL is loading, throw to trigger retry
        if (graphqlDelegations.loading) {
          throw new Error("GraphQL delegations loading...");
        }

        // If GraphQL has an error, log it and fallback to contract
        if (graphqlDelegations.error) {
          throw new Error("GraphQL delegations error");
        }
      }

      // This should never be reached, but TypeScript needs it
      throw new Error("Unexpected state: neither bootstrap nor post-bootstrap");
    },
    enabled:
      !!queryAddress && !!token.address && !!customChainId && !!bootstrapStatus,
    refetchInterval: 3000,
  });

  return query;
}
