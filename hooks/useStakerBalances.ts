import { useQueries } from "@tanstack/react-query";
import { useAssetsPrecompile } from "./useAssetsPrecompile";
import { StakerBalanceResponseFromPrecompile } from "@/types/staking";
import { Token } from "@/types/tokens";
import { getQueryStakerAddress } from "@/stores/allWalletsStore";
import { useBootstrapStatus } from "./useBootstrapStatus";
import { useBootstrap } from "./useBootstrap";
import { EVMNetwork } from "@/types/networks";

export function useStakerBalances(tokens: Token[]) {
  const { getStakerBalanceByToken } = useAssetsPrecompile();
  const { bootstrapStatus } = useBootstrapStatus();

  // Filter EVM tokens that need bootstrap contracts
  const evmTokens = tokens.filter(
    (token): token is Token & { network: EVMNetwork } =>
      "evmChainID" in token.network,
  );

  // Get unique EVM networks that need bootstrap contracts
  const uniqueEVMNetworks = evmTokens.reduce((networks, token) => {
    if (!networks.some((n) => n.evmChainID === token.network.evmChainID)) {
      networks.push(token.network);
    }
    return networks;
  }, [] as EVMNetwork[]);

  // Create bootstrap contracts for all unique networks (hooks are called unconditionally)
  // This is safe because useBootstrap will handle the case when not needed
  const bootstrapContracts = uniqueEVMNetworks.map((network) => ({
    network,
    contract: useBootstrap(network),
  }));

  const results = useQueries({
    queries: tokens.map((token) => {
      const { queryAddress, stakerAddress } = getQueryStakerAddress(token);

      const isEVMNetwork = "evmChainID" in token.network;

      // Find the corresponding Bootstrap contract for this token
      const bootstrapContract = isEVMNetwork
        ? bootstrapContracts.find(
            (bc) =>
              bc.network.customChainIdByImua ===
              token.network.customChainIdByImua,
          )?.contract
        : undefined;

      return {
        queryKey: [
          "stakerBalanceByToken",
          queryAddress,
          token.network.customChainIdByImua,
          token.address,
          bootstrapStatus?.isBootstrapped, // Include bootstrap status in query key
        ],
        queryFn: async (): Promise<StakerBalanceResponseFromPrecompile> => {
          if (
            !queryAddress ||
            !token.network.customChainIdByImua ||
            !token.address
          ) {
            throw new Error("Invalid parameters");
          }

          // For non-EVM networks (like XRPL, Bitcoin)
          if (!isEVMNetwork) {
            if (bootstrapStatus?.isBootstrapped) {
              // Post-bootstrap: Use Imuachain precompiles
              const stakerBalanceResponse = await getStakerBalanceByToken(
                queryAddress as `0x${string}`,
                token.network.customChainIdByImua,
                token.address as `0x${string}`,
              );
              return stakerBalanceResponse;
            } else {
              // Bootstrap phase: No Imuachain yet, return zero balances as temporary workaround
              // TODO: Implement vault scanning for Bitcoin/XRPL deposits during bootstrap
              return {
                clientChainID: token.network.customChainIdByImua,
                stakerAddress: queryAddress as `0x${string}`,
                tokenID: token.address as `0x${string}`,
                balance: BigInt(0),
                withdrawable: BigInt(0),
                delegated: BigInt(0),
                pendingUndelegated: BigInt(0),
                totalDeposited: BigInt(0),
              };
            }
          }

          if (bootstrapStatus?.isBootstrapped) {
            // Post-bootstrap: Use Imuachain precompiles via ClientChainGateway
            const stakerBalanceResponse = await getStakerBalanceByToken(
              queryAddress as `0x${string}`,
              token.network.customChainIdByImua,
              token.address as `0x${string}`,
            );
            return stakerBalanceResponse;
          } else {
            // Bootstrap phase: Query Bootstrap contract directly
            if (!bootstrapContract?.readonlyContract) {
              throw new Error("Bootstrap contract not available");
            }

            try {
              // Query Bootstrap contract for balance information
              const [totalDeposited, withdrawable] = await Promise.all([
                bootstrapContract.readonlyContract.read.totalDepositAmounts([
                  queryAddress as `0x${string}`,
                  token.address as `0x${string}`,
                ]),
                bootstrapContract.readonlyContract.read.withdrawableAmounts([
                  queryAddress as `0x${string}`,
                  token.address as `0x${string}`,
                ]),
              ]);

              // Calculate delegated balance: totalDeposited - withdrawable
              const delegated =
                (totalDeposited as bigint) - (withdrawable as bigint);

              // During bootstrap: no pending undelegated (all undelegations are instant)
              const pendingUndelegated = BigInt(0);

              return {
                clientChainID: token.network.customChainIdByImua,
                stakerAddress: queryAddress as `0x${string}`,
                tokenID: token.address as `0x${string}`,
                balance: totalDeposited as bigint, // Total balance (deposited)
                withdrawable: withdrawable as bigint, // Claimable balance
                delegated: delegated, // Delegated balance
                pendingUndelegated: pendingUndelegated, // Always 0 during bootstrap
                totalDeposited: totalDeposited as bigint, // Total deposited amount
              };
            } catch (error) {
              console.error("Error fetching bootstrap balance:", error);
              throw new Error(
                `Failed to fetch bootstrap balance: ${error instanceof Error ? error.message : "Unknown error"}`,
              );
            }
          }
        },
        enabled:
          !!queryAddress &&
          !!token.address &&
          !!bootstrapStatus && // Wait for bootstrap status to be available
          // customChainIdByImua is only required after bootstrap (for Imuachain queries)
          (bootstrapStatus.isBootstrapped
            ? !!token.network.customChainIdByImua
            : true) &&
          (!isEVMNetwork ||
            !bootstrapStatus.isBootstrapped ||
            !!bootstrapContract?.readonlyContract), // Ensure contract is available when needed
        refetchInterval: 3000,
      };
    }),
  });

  return results;
}
