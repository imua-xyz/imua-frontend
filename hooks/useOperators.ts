import { useQueries, useQuery } from "@tanstack/react-query";
import { COSMOS_CONFIG } from "@/config/cosmos";
import { OperatorInfo, OptInAVSPerOperator } from "@/types/operator";

async function fetchOperators(): Promise<OperatorInfo[]> {
  // First get all operator addresses
  const response = await fetch(
    `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.ALL_OPERATORS}`,
  );
  const { operator_acc_addrs: addresses } = await response.json();

  // Then fetch details for each operator
  const operatorDetails = await Promise.all(
    addresses.map(async (addr: string) => {
      const infoResponse = await fetch(
        `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.OPERATOR_INFO(addr)}`,
      );
      const info = await infoResponse.json();
      return {
        address: addr,
        ...info,
        apr: (Math.random() * 7 + 3).toFixed(2),
      };
    }),
  );

  return operatorDetails;
}

export function useOperators(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const operators = await fetchOperators();
      // Sort by commission rate (ascending)
      return operators.sort(
        (a, b) =>
          Number(a.commission.commission_rates.rate) -
          Number(b.commission.commission_rates.rate),
      );
    },
    refetchInterval: 30000,
    enabled: options?.enabled,
  });
}

async function fetchOptInAVSForOperator(
  operatorAddress: string,
): Promise<OptInAVSPerOperator> {
  let optInAVS: string[] = [];
  try {
    const avsResponse = await fetch(
      `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.OPT_IN_AVS(operatorAddress)}`,
    );
    if (avsResponse.ok) {
      const avsData = await avsResponse.json();
      optInAVS = avsData.avs_list || [];
    }
  } catch (error) {
    console.warn(
      `Failed to fetch opt-in AVS for operator ${operatorAddress}:`,
      error,
    );
  }

  return {
    operatorAddress,
    optInAVS,
  };
}

export function useOperatorsWithOptInAVS(operatorAddresses: string[]) {
  const queries = operatorAddresses.map((operatorAddress) => ({
    queryKey: ["operator-opt-in-avs", operatorAddress],
    queryFn: async (): Promise<OptInAVSPerOperator> => {
      return fetchOptInAVSForOperator(operatorAddress);
    },
    refetchInterval: 30000,
  }));

  const results = useQueries({ queries });
  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r && r.error)?.error || null;

  return {
    data: results
      .map((result) => result.data)
      .filter(Boolean) as OptInAVSPerOperator[],
    isLoading,
    error,
  };
}
