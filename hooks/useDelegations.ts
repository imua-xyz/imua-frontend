import { useQueries } from "@tanstack/react-query";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { COSMOS_CONFIG } from "@/config/cosmos";
import { validTokens, Token } from "@/types/tokens";
import { DelegationsPerToken, DelegationsResponse } from "@/types/delegations";
import { useAllWalletsStore } from "@/stores/allWalletsStore";
import { useOperators } from "./useOperators";

// If no staker address, returns { data: undefined, isLoading: false, error: null, ... }
export function useDelegations(token: Token): {
  data: DelegationsPerToken | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { data: operators } = useOperators();
  const wallets = useAllWalletsStore((s) => s.wallets);
  const wallet = wallets[token.network.customChainIdByImua];
  let stakerAddress: string | undefined = undefined;
  if (wallet) {
    if (token.connector.requireExtraConnectToImua) {
      if (wallet.boundImuaAddress) {
        stakerAddress = wallet.boundImuaAddress;
      } else if (wallet.address) {
        // User has not bound an imua address yet, treat as no delegations
        stakerAddress = undefined;
      } else {
        stakerAddress = undefined;
      }
    } else {
      stakerAddress = wallet.address;
    }
  }
  if (!stakerAddress) {
    // No wallet connected for this token, return empty delegations
    return {
      data: undefined,
      isLoading: false,
      error: null,
    };
  }
  const customChainId = token.network.customChainIdByImua;
  return useQuery({
    queryKey: ["delegations", stakerAddress, token.address, customChainId],
    queryFn: async (): Promise<DelegationsPerToken> => {
      // Cosmos RPC: /imuachain/delegation/v1/delegations/{stakerId}/{assetId}
      const stakerId = `${stakerAddress.toLowerCase()}_0x${customChainId.toString(16)}`;
      const assetId = `${token.address.toLowerCase()}_0x${customChainId.toString(16)}`;
      const url = `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.DELEGATION_INFO(stakerId, assetId)}`;
      const data = (await fetch(url).then((r) =>
        r.json(),
      )) as DelegationsResponse;
      const infos = data.delegation_infos || [];
      return {
        token,
        userAddress: stakerAddress!,
        delegations: infos.map((item) => ({
          operatorAddress: item.operator,
          operatorName: operators?.find(
            (op) => op.address.toLowerCase() === item.operator.toLowerCase(),
          )?.operator_meta_info,
          delegated: BigInt(item.delegation_info.max_undelegatable_amount),
          unbonding: BigInt(
            item.delegation_info.delegation_amounts.wait_undelegation_amount,
          ),
        })),
      };
    },
    enabled: !!stakerAddress && !!token.address && !!customChainId,
    refetchInterval: 30000,
  });
}

export function useAllDelegations() {
  const wallets = useAllWalletsStore((s) => s.wallets);
  const { data: operators } = useOperators();

  // Create queries for all tokens
  const queries = validTokens.map((token) => {
    const wallet = wallets[token.network.customChainIdByImua];
    let stakerAddress: string | undefined = undefined;

    if (wallet) {
      if (token.connector.requireExtraConnectToImua) {
        if (wallet.boundImuaAddress) {
          stakerAddress = wallet.boundImuaAddress;
        } else if (wallet.address) {
          // User has not bound an imua address yet, treat as no delegations
          stakerAddress = undefined;
        } else {
          stakerAddress = undefined;
        }
      } else {
        stakerAddress = wallet.address;
      }
    }

    return {
      queryKey: [
        "delegations",
        stakerAddress,
        token.address,
        token.network.customChainIdByImua,
      ],
      queryFn: async (): Promise<DelegationsPerToken> => {
        if (!stakerAddress) {
          // Return empty delegations for non-fetchable cases
          return {
            token,
            userAddress: "",
            delegations: [],
          };
        }

        const customChainId = token.network.customChainIdByImua;
        // Cosmos RPC: /imuachain/delegation/v1/delegations/{stakerId}/{assetId}
        const stakerId = `${stakerAddress.toLowerCase()}_0x${customChainId.toString(16)}`;
        const assetId = `${token.address.toLowerCase()}_0x${customChainId.toString(16)}`;
        const url = `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.DELEGATION_INFO(stakerId, assetId)}`;
        const data = (await fetch(url).then((r) =>
          r.json(),
        )) as DelegationsResponse;
        const infos = data.delegation_infos || [];
        return {
          token,
          userAddress: stakerAddress,
          delegations: infos.map((item) => ({
            operatorAddress: item.operator,
            operatorName: operators?.find(
              (op) => op.address.toLowerCase() === item.operator.toLowerCase(),
            )?.operator_meta_info,
            delegated: BigInt(item.delegation_info.max_undelegatable_amount),
            unbonding: BigInt(
              item.delegation_info.delegation_amounts.wait_undelegation_amount,
            ),
          })),
        };
      },
      enabled:
        !!stakerAddress &&
        !!token.address &&
        !!token.network.customChainIdByImua,
      refetchInterval: 30000,
    };
  });

  const results = useQueries({ queries });
  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r && r.error)?.error || undefined;

  return { results, isLoading, error };
}
