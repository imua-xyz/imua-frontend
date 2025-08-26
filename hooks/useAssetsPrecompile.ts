import { useCallback } from "react";
import { useChainId } from "wagmi";
import { getContract } from "viem";
import IAssetsABI from "@/abi/IAssets.abi.json";
import { imua, publicClients } from "@/config/wagmi";
import { encodePacked } from "viem";
import { StakerBalanceResponseFromPrecompile } from "@/types/staking";

// Address of the IAssets precompile contract
export const ASSETS_PRECOMPILE_ADDRESS =
  "0x0000000000000000000000000000000000000804";

export function useAssetsPrecompile() {
  // Get the public client for the current chain (or fallback to imua chain)
  // The Assets precompile is on the Imua chain, so we want to use that client
  const imuaPublicClient = publicClients[imua.id as keyof typeof publicClients];

  // Create contract instance
  const contract = getContract({
    address: ASSETS_PRECOMPILE_ADDRESS as `0x${string}`,
    abi: IAssetsABI,
    client: {
      public: imuaPublicClient,
    },
  });

  // Helper method to get staker balance
  const getStakerBalanceByToken = useCallback(
    async (
      userAddress: `0x${string}`,
      endpointId?: number,
      tokenAddress?: `0x${string}`,
    ): Promise<StakerBalanceResponseFromPrecompile> => {
      if (!contract || !tokenAddress || !userAddress || !endpointId)
        throw new Error("Invalid parameters");

      try {
        // Use the contract instance to call the method
        const [success, stakerBalanceResponse] = (await contract.read.getStakerBalanceByToken([
          endpointId,
          encodePacked(["address"], [userAddress]),
          encodePacked(["address"], [tokenAddress]),
        ])) as [boolean, StakerBalanceResponseFromPrecompile];

        if (!success || !stakerBalanceResponse) {
          return {
            clientChainID: endpointId,
            stakerAddress: userAddress,
            tokenID: tokenAddress,
            balance: BigInt(0),
            withdrawable: BigInt(0),
            delegated: BigInt(0),
            pendingUndelegated: BigInt(0),
            totalDeposited: BigInt(0),
          };
        }

        return stakerBalanceResponse;
      } catch (error) {
        console.error(
          `Failed to read staker balance for ${tokenAddress} at endpoint ${endpointId}:`,
          error,
        );
        throw new Error("Failed to read staker balance");
      }
    },
    [contract],
  );

  return {
    contract,
    getStakerBalanceByToken,
  };
}
