import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBalance } from "wagmi";
import { useClientChainGateway } from "./useClientChainGateway";
import { maxUint256, getContract, erc20Abi } from "viem";
import { useTxUtils } from "./useTxUtils";
import {
  TxHandlerOptions,
  TxStatus,
  StakingProvider,
  StakerBalance,
  WalletBalance,
} from "@/types/staking";
import { useAssetsPrecompile } from "./useAssetsPrecompile";
import { useVault } from "./useVault";
import { getMetadataByEvmChainID } from "@/config/stakingPortals";

export function useLSTStakingProvider(
  token: `0x${string}` | undefined,
): StakingProvider {
  const {
    contract,
    publicClient,
    walletClient,
    userAddress,
    chainId,
    getQuote,
    isConnected,
    getVaultAddress,
  } = useClientChainGateway();
  const metadata = getMetadataByEvmChainID(chainId as number);
  const lzEndpointIdOrCustomChainId = metadata?.customChainIdByImua;

  const vaultAddressQuery = useQuery({
    queryKey: ["vaultAddress", token],
    queryFn: () => getVaultAddress(token),
    enabled: !!token && !!getVaultAddress,
  });
  const vaultAddress = vaultAddressQuery.data;
  const isClientChainGatewayAvailable = contract ? true : false;
  const isStakingEnabled =
    isClientChainGatewayAvailable &&
    !!vaultAddress &&
    !!metadata &&
    !!lzEndpointIdOrCustomChainId;

  const { handleEVMTxWithStatus } = useTxUtils();
  const { getStakerBalanceByToken } = useAssetsPrecompile();
  const { data } = useBalance({ address: userAddress, token: token });
  const walletBalance = {
    customClientChainID: lzEndpointIdOrCustomChainId || 0,
    stakerAddress: userAddress as `0x${string}`,
    tokenID: token,
    value: data?.value || BigInt(0),
    decimals: data?.decimals || 0,
    symbol: data?.symbol || "",
  };
  const { withdrawableAmount: withdrawableAmountFromVault } =
    useVault(vaultAddress);

  const handleDeposit = useCallback(
    async (amount: bigint, options?: TxHandlerOptions) => {
      if (!contract || !amount) throw new Error("Invalid parameters");
      const fee = await getQuote("asset");

      return handleEVMTxWithStatus(
        contract.write.deposit([token, amount], { value: fee }),
        options,
      );
    },
    [contract, token, handleEVMTxWithStatus, getQuote],
  );

  const handleDelegateTo = useCallback(
    async (operator: string, amount: bigint, options?: TxHandlerOptions) => {
      if (!contract || !amount || !operator)
        throw new Error("Invalid parameters");
      const fee = await getQuote("delegation");

      return handleEVMTxWithStatus(
        contract.write.delegateTo([operator, token, amount], { value: fee }),
        options,
      );
    },
    [contract, token, handleEVMTxWithStatus, getQuote],
  );

  const handleUndelegateFrom = useCallback(
    async (operator: string, amount: bigint, options?: TxHandlerOptions) => {
      if (!contract || !amount || !operator)
        throw new Error("Invalid parameters");
      const fee = await getQuote("delegation");

      return handleEVMTxWithStatus(
        contract.write.undelegateFrom([operator, token, amount], {
          value: fee,
        }),
        options,
      );
    },
    [contract, token, handleEVMTxWithStatus, getQuote],
  );

  const handleDepositAndDelegate = useCallback(
    async (amount: bigint, operator: string, options?: TxHandlerOptions) => {
      if (!contract || !amount || !operator)
        throw new Error("Invalid parameters");
      const fee = await getQuote("delegation");

      return handleEVMTxWithStatus(
        contract.write.depositThenDelegateTo([token, amount, operator], {
          value: fee,
        }),
        options,
      );
    },
    [contract, token, handleEVMTxWithStatus, getQuote],
  );

  const handleClaimPrincipal = useCallback(
    async (amount: bigint, options?: TxHandlerOptions) => {
      if (!contract || !amount) throw new Error("Invalid parameters");
      const fee = await getQuote("asset");

      return handleEVMTxWithStatus(
        contract.write.claimPrincipalFromImuachain([token, amount], {
          value: fee,
        }),
        options,
      );
    },
    [contract, token, handleEVMTxWithStatus, getQuote],
  );

  const handleWithdrawPrincipal = useCallback(
    async (
      amount: bigint,
      recipient?: `0x${string}`,
      options?: TxHandlerOptions,
    ) => {
      if (!contract || !amount || !recipient)
        throw new Error("Invalid parameters");

      return handleEVMTxWithStatus(
        contract.write.withdrawPrincipal([token, amount, recipient]),
        options,
      );
    },
    [contract, token, handleEVMTxWithStatus],
  );

  const handleStakeWithApproval = useCallback(
    async (
      amount: bigint,
      vaultAddress: `0x${string}`,
      operatorAddress?: string,
      options?: { onStatus?: (status: TxStatus, error?: string) => void },
    ) => {
      if (!contract || !amount || !publicClient || !walletClient)
        throw new Error("Invalid parameters");

      try {
        // Create token contract instance
        const tokenContract = token
          ? getContract({
              address: token,
              abi: erc20Abi,
              client: {
                public: publicClient,
                wallet: walletClient,
              },
            })
          : undefined;

        // Check allowance using token contract
        const currentAllowance = await tokenContract?.read.allowance([
          userAddress as `0x${string}`,
          vaultAddress,
        ]);
        if (currentAllowance && currentAllowance < amount) {
          options?.onStatus?.("approving");
          const approvalHash = await tokenContract?.write.approve([
            vaultAddress,
            maxUint256,
          ]);
          if (!approvalHash) throw new Error("Failed to approve token");

          await publicClient.waitForTransactionReceipt({
            hash: approvalHash,
            timeout: 30_000,
          });

          // Wait a second after successful receipt
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Proceed with stake/deposit
        return operatorAddress
          ? handleDepositAndDelegate(amount, operatorAddress, options)
          : handleDeposit(amount, options);
      } catch (error) {
        options?.onStatus?.(
          "error",
          error instanceof Error ? error.message : "Transaction failed",
        );
        throw error;
      }
    },
    [contract, publicClient, token, handleDeposit, handleDepositAndDelegate],
  );

  const stakerBalance = useQuery({
    queryKey: ["stakerBalance", chainId, userAddress, token],
    queryFn: async (): Promise<StakerBalance> => {
      const { success, stakerBalanceResponse } = await getStakerBalanceByToken(
        userAddress as `0x${string}`,
        lzEndpointIdOrCustomChainId,
        token,
      );
      
      if (!success || !stakerBalanceResponse) {
        throw new Error("Failed to fetch staker balance");
      }
      
      return {
        clientChainID: stakerBalanceResponse.clientChainID,
        stakerAddress: stakerBalanceResponse.stakerAddress,
        tokenID: stakerBalanceResponse.tokenID,
        totalBalance: stakerBalanceResponse.balance,
        claimable: stakerBalanceResponse.withdrawable,
        withdrawable: withdrawableAmountFromVault || BigInt(0),
        delegated: stakerBalanceResponse.delegated,
        pendingUndelegated: stakerBalanceResponse.pendingUndelegated,
        totalDeposited: stakerBalanceResponse.totalDeposited,
      };
    },
    refetchInterval: 30000,
    enabled: !!userAddress && !!chainId && !!token,
  });

  return {
    deposit: handleDeposit,
    depositAndDelegate: handleDepositAndDelegate,
    delegateTo: handleDelegateTo,
    undelegateFrom: handleUndelegateFrom,
    claimPrincipal: handleClaimPrincipal,
    withdrawPrincipal: handleWithdrawPrincipal,
    stake: handleStakeWithApproval,
    getQuote: getQuote,
    stakerBalance: stakerBalance?.data,
    walletBalance: walletBalance,
    isWalletConnected: isConnected,
    isStakingEnabled: isStakingEnabled,
    vaultAddress: vaultAddress,
    metadata: metadata,
  };
}
