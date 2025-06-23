import { useQuery } from "@tanstack/react-query";
import { COSMOS_CONFIG } from "@/config/cosmos";
import { OperatorInfo } from "@/types/operator";

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
