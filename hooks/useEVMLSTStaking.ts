import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBalance } from "wagmi";
import { maxUint256, getContract, erc20Abi } from "viem";
import { TxHandlerOptions, TxStatus, StakerBalance } from "@/types/staking";
import { StakingService } from "@/types/staking-service";
import { useAssetsPrecompile } from "./useAssetsPrecompile";
import { useVault } from "./useVault";
import { EVMLSTToken } from "@/types/tokens";
import { usePortalContract } from "./usePortalContract";
import { useAccount } from "wagmi";
import { OperationType } from "@/types/staking";
import { handleEVMTxWithStatus } from "@/lib/txUtils";
import { useBootstrapStatus } from "./useBootstrapStatus";
import { useStakerBalanceByToken } from "./useStakerBalanceByToken";

export function useEVMLSTStaking(token: EVMLSTToken): StakingService {
  const { address: userAddress, chainId } = useAccount();
  const { contract, publicClient, walletClient } = usePortalContract(
    token.network,
  );
  const { getStakerBalanceByToken } = useAssetsPrecompile();
  const { data: balance } = useBalance({
    address: userAddress,
    token: token.address,
  });
  const [vaultAddress, setVaultAddress] = useState<`0x${string}` | null>(null);
  const lzEndpointIdOrCustomChainId = token.network.customChainIdByImua;
  const { bootstrapStatus } = useBootstrapStatus();

  const { data: valultAddress } = useQuery({
    queryKey: ["vaultAddress", token.network.evmChainID, token.address],
    queryFn: async (): Promise<`0x${string}`> => {
      if (!contract) throw new Error("Invalid Contract");
      const vaultAddress = await contract.read.tokenToVault([token.address]);
      setVaultAddress(vaultAddress as `0x${string}`);
      return vaultAddress as `0x${string}`;
    },
    refetchInterval: 30000,
    enabled: !!token && !!contract && !vaultAddress,
  });

  const { withdrawableAmount: withdrawableAmountFromVault } = useVault(
    vaultAddress || undefined,
  );

  const walletBalance = {
    customClientChainID: lzEndpointIdOrCustomChainId || 0,
    stakerAddress: userAddress as `0x${string}`,
    tokenID: token.address,
    value: balance?.value || BigInt(0),
    decimals: balance?.decimals || 0,
    symbol: balance?.symbol || "",
  };

  const getQuote = useCallback(
    async (operation: OperationType): Promise<bigint> => {
      if (!contract) return BigInt(0);

      const lengths = {
        asset: 97,
        delegation: 138,
        associate: 74,
        dissociate: 33,
      };

      const message = "0x" + "00".repeat(lengths[operation]);
      const fee = await contract.read.quote([message]);
      return fee as bigint;
    },
    [contract],
  );

  const handleDeposit = useCallback(
    async (amount: bigint, options?: TxHandlerOptions) => {
      if (!contract || !amount) throw new Error("Invalid parameters");
      const fee = await getQuote("asset");

      return handleEVMTxWithStatus(
        contract.write.deposit([token.address, amount], { value: fee }),
        publicClient,
        options,
      );
    },
    [contract, token.address, handleEVMTxWithStatus, getQuote],
  );

  const handleDelegateTo = useCallback(
    async (operator: string, amount: bigint, options?: TxHandlerOptions) => {
      if (!contract || !amount || !operator)
        throw new Error("Invalid parameters");
      const fee = await getQuote("delegation");

      return handleEVMTxWithStatus(
        contract.write.delegateTo([operator, token.address, amount], {
          value: fee,
        }),
        publicClient,
        options,
      );
    },
    [contract, token.address, handleEVMTxWithStatus, getQuote],
  );

  const handleUndelegateFrom = useCallback(
    async (operator: string, amount: bigint, options?: TxHandlerOptions) => {
      if (!contract || !amount || !operator)
        throw new Error("Invalid parameters");
      const fee = await getQuote("delegation");

      return handleEVMTxWithStatus(
        contract.write.undelegateFrom([operator, token.address, amount], {
          value: fee,
        }),
        publicClient,
        options,
      );
    },
    [contract, token.address, handleEVMTxWithStatus, getQuote],
  );

  const handleDepositAndDelegate = useCallback(
    async (amount: bigint, operator: string, options?: TxHandlerOptions) => {
      if (!contract || !amount || !operator)
        throw new Error("Invalid parameters");
      const fee = await getQuote("delegation");

      return handleEVMTxWithStatus(
        contract.write.depositThenDelegateTo(
          [token.address, amount, operator],
          {
            value: fee,
          },
        ),
        publicClient,
        options,
      );
    },
    [contract, token.address, handleEVMTxWithStatus, getQuote],
  );

  const handleClaimPrincipal = useCallback(
    async (amount: bigint, options?: TxHandlerOptions) => {
      if (!contract || !amount) throw new Error("Invalid parameters");
      const fee = await getQuote("asset");

      return handleEVMTxWithStatus(
        contract.write.claimPrincipalFromImuachain([token.address, amount], {
          value: fee,
        }),
        publicClient,
        options,
      );
    },
    [contract, token.address, handleEVMTxWithStatus, getQuote],
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
        contract.write.withdrawPrincipal([token.address, amount, recipient]),
        publicClient,
        options,
      );
    },
    [contract, token.address, handleEVMTxWithStatus],
  );

  const handleStakeWithApproval = useCallback(
    async (
      amount: bigint,
      operatorAddress?: string,
      options?: { onStatus?: (status: TxStatus, error?: string) => void },
    ) => {
      if (
        !contract ||
        !amount ||
        !publicClient ||
        !walletClient ||
        !vaultAddress
      )
        throw new Error("Invalid parameters");

      try {
        // Create token contract instance
        const tokenContract = token.address
          ? getContract({
              address: token.address,
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
          "Transaction rejected by the user Or Transaction failed",
        );
        throw error;
      }
    },
    [
      contract,
      publicClient,
      token.address,
      handleDeposit,
      handleDepositAndDelegate,
      vaultAddress,
    ],
  );

  const stakerBalance = useQuery({
    queryKey: [
      "stakerBalance",
      lzEndpointIdOrCustomChainId,
      userAddress,
      token.address,
    ],
    queryFn: async (): Promise<StakerBalance> => {
      const isBootstrapped = bootstrapStatus?.isBootstrapped;

      if (isBootstrapped) {
        const { data: stakerBalanceResponse } = useStakerBalanceByToken(
          userAddress as `0x${string}`,
          lzEndpointIdOrCustomChainId,
          token.address,
        );

        if (!stakerBalanceResponse)
          throw new Error("Failed to fetch staker balance");

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
      } else {
        const claimable = await contract?.read.withdrawableAmounts([
          userAddress as `0x${string}`,
          token.address,
        ]);
        const totalDeposited = await contract?.read.totalDepositAmounts([
          userAddress as `0x${string}`,
          token.address,
        ]);
        return {
          clientChainID: lzEndpointIdOrCustomChainId,
          stakerAddress: userAddress as `0x${string}`,
          tokenID: token.address,
          totalBalance: totalDeposited as bigint,
          claimable: claimable as bigint,
          withdrawable: withdrawableAmountFromVault || BigInt(0),
          delegated: (totalDeposited as bigint) - (claimable as bigint),
          pendingUndelegated: BigInt(0),
          totalDeposited: totalDeposited as bigint,
        };
      }
    },
    refetchInterval: 30000,
    enabled: !!userAddress && !!lzEndpointIdOrCustomChainId && !!token.address,
  });

  return {
    token: token,
    stakerBalance: stakerBalance?.data,
    walletBalance: walletBalance,
    vaultAddress: vaultAddress || undefined,

    deposit: handleDeposit,
    depositAndDelegate: handleDepositAndDelegate,
    delegateTo: handleDelegateTo,
    undelegateFrom: handleUndelegateFrom,
    claimPrincipal: handleClaimPrincipal,
    withdrawPrincipal: handleWithdrawPrincipal,
    stake: handleStakeWithApproval,
    getQuote: getQuote,
  };
}
