import { useQueries, useQuery } from "@tanstack/react-query";
import { COSMOS_CONFIG } from "@/config/cosmos";
import { OperatorInfo, OptInAVSPerOperator } from "@/types/operator";
import { useBootstrapStatus } from "./useBootstrapStatus";
import { useBootstrap } from "./useBootstrap";
import { hoodi } from "@/types/networks";

// Cache for Bootstrap operators to avoid repeated contract calls
let bootstrapOperatorsCache: {
  count: number;
  operators: OperatorInfo[];
  lastUpdate: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchBootstrapOperators(contract: any): Promise<OperatorInfo[]> {
  const now = Date.now();

  // Check if cache is valid
  if (
    bootstrapOperatorsCache &&
    now - bootstrapOperatorsCache.lastUpdate < CACHE_DURATION
  ) {
    return bootstrapOperatorsCache.operators;
  }

  // Get current validator count
  const count = (await contract.read.getValidatorsCount([])) as bigint;
  const currentCount = Number(count);

  // Verify that we're not trying to access beyond the actual count
  if (currentCount === 0) {
    return [];
  }

  // If we have cached operators and count hasn't changed, just update commission rates
  if (
    bootstrapOperatorsCache &&
    bootstrapOperatorsCache.count === currentCount
  ) {
    // Update commission rates for existing operators (only thing that can change)
    const updatedOperators = await Promise.all(
      bootstrapOperatorsCache.operators.map(async (operator) => {
        // Use cached address (which is the Imua address), only fetch commission rates
        const rawValidatorInfo = await contract.read.validators([
          operator.address,
        ]);
        const [version, commissionData, consensusPublicKey] =
          rawValidatorInfo as [string, any, string];

        return {
          ...operator,
          commission: {
            commission_rates: {
              rate: commissionData.rate.toString(),
              max_rate: commissionData.maxRate.toString(),
              max_change_rate: commissionData.maxChangeRate.toString(),
            },
            update_time: "",
          },
          operator_meta_info: version ?? operator.operator_meta_info,
        };
      }),
    );

    // Update cache timestamp
    bootstrapOperatorsCache.lastUpdate = now;
    bootstrapOperatorsCache.operators = updatedOperators;

    return updatedOperators;
  }

  // If count increased, do incremental fetch for new validators only
  if (bootstrapOperatorsCache && bootstrapOperatorsCache.count < currentCount) {
    const existingOperators = bootstrapOperatorsCache.operators;
    const newCount = currentCount - bootstrapOperatorsCache.count;

    // Fetch only the new validators (from the end of the array)
    const newOperators = await Promise.all(
      Array.from({ length: newCount }, (_, i) => {
        const index = bootstrapOperatorsCache!.count + i;
        return fetchValidatorAtIndex(contract, index);
      }),
    );

    // Combine existing and new operators
    const allOperators = [...existingOperators, ...newOperators];

    // Update cache
    bootstrapOperatorsCache = {
      count: currentCount,
      operators: allOperators,
      lastUpdate: now,
    };

    return allOperators;
  }

  // Full fetch needed - first time
  const operators = await Promise.all(
    Array.from({ length: currentCount }, (_, i) =>
      fetchValidatorAtIndex(contract, i).catch((error) => {
        console.error(`Failed to fetch validator at index ${i}:`, error);
        return null;
      }),
    ),
  );

  // Filter out any null results
  const validOperators = operators.filter(
    (operator): operator is OperatorInfo => operator !== null,
  );

  // Update cache
  bootstrapOperatorsCache = {
    count: currentCount,
    operators: validOperators,
    lastUpdate: now,
  };

  return validOperators;
}

// Helper function to fetch a single validator at a specific index
async function fetchValidatorAtIndex(
  contract: any,
  index: number,
): Promise<OperatorInfo> {
  const ethAddr = (await contract.read.registeredValidators([
    BigInt(index),
  ])) as `0x${string}`;
  const imAddr = (await contract.read.ethToImAddress([ethAddr])) as string;
  const rawValidatorInfo = await contract.read.validators([imAddr]);

  // The contract returns an array: [version, commission, consensusPublicKey]
  if (!Array.isArray(rawValidatorInfo) || rawValidatorInfo.length < 3) {
    throw new Error(
      `Invalid validator info format for index ${index}, ethAddr: ${ethAddr}, imAddr: ${imAddr}, rawValidatorInfo: ${JSON.stringify(rawValidatorInfo)}`,
    );
  }

  const [version, commissionData, consensusPublicKey] = rawValidatorInfo;

  // Check if commission data exists
  if (!commissionData || typeof commissionData !== "object") {
    throw new Error(
      `Commission data is invalid for validator at index ${index}, commissionData: ${JSON.stringify(commissionData)}`,
    );
  }

  const info: OperatorInfo = {
    address: imAddr, // Bech32-encoded Imua address (as per OperatorInfo interface)
    commission: {
      commission_rates: {
        rate: commissionData.rate.toString(),
        max_rate: commissionData.maxRate.toString(),
        max_change_rate: commissionData.maxChangeRate.toString(),
      },
      update_time: "",
    },
    earnings_addr: "",
    approve_addr: "",
    operator_meta_info: version ?? "", // Use version as name since that's what we have
    client_chain_earnings_addr: { earning_info_list: [] },
    apr: Number((Math.random() * 7 + 3).toFixed(2)),
  };
  return info;
}

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
  const { bootstrapStatus } = useBootstrapStatus();
  const bootstrap = useBootstrap(hoodi);

  return useQuery({
    queryKey: ["operators", bootstrapStatus?.isBootstrapped],
    queryFn: async () => {
      // Post-bootstrap: fetch from Imuachain (Cosmos API)
      if (bootstrapStatus?.isBootstrapped) {
        const operators = await fetchOperators();
        return operators.sort(
          (a, b) =>
            Number(a.commission.commission_rates.rate) -
            Number(b.commission.commission_rates.rate),
        );
      }

      // Bootstrap phase: read operators from Bootstrap contract
      if (!bootstrap.readonlyContract) {
        return [] as OperatorInfo[];
      }

      const operators = await fetchBootstrapOperators(
        bootstrap.readonlyContract,
      );

      // Sort by commission rate (ascending)
      return operators.sort(
        (a, b) =>
          Number(a.commission.commission_rates.rate) -
          Number(b.commission.commission_rates.rate),
      );
    },
    refetchInterval: 30000,
    enabled: options?.enabled !== false,
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
