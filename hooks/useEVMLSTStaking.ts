import { useCallback, useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBalance } from "wagmi";
import { maxUint256, getContract, erc20Abi } from "viem";
import { BaseTxOptions, StakerBalance } from "@/types/staking";
import { StakingService } from "@/types/staking-service";
import { useEVMVault } from "./useVault";
import { EVMLSTToken } from "@/types/tokens";
import { usePortalContract } from "./usePortalContract";
import { useAccount } from "wagmi";
import { OperationType } from "@/types/staking";
import { handleEVMTxWithStatus } from "@/lib/txUtils";
import { useBootstrapStatus } from "./useBootstrapStatus";
import { useStakerBalances } from "./useStakerBalances";
import { useAssetsPrecompile } from "./useAssetsPrecompile";
import { useERC20Token } from "./useERC20Token";
import { useDelegations } from "./useDelegations";

export function useEVMLSTStaking(token: EVMLSTToken): StakingService {
  const { address: userAddress, chainId } = useAccount();
  const { contract, publicClient, walletClient } = usePortalContract(
    token.network,
  );
  const { vault, vaultAddress } = useEVMVault(token);
  const { contract: erc20Contract } = useERC20Token(token);
  const queryClient = useQueryClient();
  const delegations = useDelegations(token);

  const balance = useBalance({
    address: userAddress,
    token: token.address,
  });
  const lzEndpointIdOrCustomChainId = token.network.customChainIdByImua;
  const { bootstrapStatus } = useBootstrapStatus();
  const { getStakerBalanceByToken } = useAssetsPrecompile();

  const [stakerBalanceAfterBootstrap] = useStakerBalances([token]);
  const withdrawableAmountFromVault = useQuery({
    queryKey: ["withdrawableAmountFromVault", token.network.evmChainID, vaultAddress, userAddress],
    queryFn: async (): Promise<bigint> => {
      if (!vault || !userAddress) throw new Error("Invalid parameters");
      const withdrawable = await vault.read.getWithdrawableBalance([userAddress as `0x${string}`]);
      return withdrawable as bigint || BigInt(0);
    },
    enabled: !!vault && !!userAddress,
    refetchInterval: 3000,
  });

  // Define stakerBalance query first so it can be used in other functions
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
        return {
          clientChainID: stakerBalanceAfterBootstrap.data?.clientChainID || lzEndpointIdOrCustomChainId,
          stakerAddress: stakerBalanceAfterBootstrap.data?.stakerAddress || userAddress as `0x${string}`,
          tokenID: stakerBalanceAfterBootstrap.data?.tokenID || token.address,
          totalBalance: stakerBalanceAfterBootstrap.data?.balance || BigInt(0),
          claimable: stakerBalanceAfterBootstrap.data?.withdrawable,
          withdrawable: withdrawableAmountFromVault.data || BigInt(0),
          delegated: stakerBalanceAfterBootstrap.data?.delegated || BigInt(0),
          pendingUndelegated: stakerBalanceAfterBootstrap.data?.pendingUndelegated || BigInt(0),
          totalDeposited: stakerBalanceAfterBootstrap.data?.totalDeposited || BigInt(0),
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
          withdrawable: withdrawableAmountFromVault.data || BigInt(0),
          delegated: (totalDeposited as bigint) - (claimable as bigint),
          pendingUndelegated: BigInt(0),
          totalDeposited: totalDeposited as bigint,
        };
      }
    },
    refetchInterval: 3000,
    enabled: !!userAddress && !!lzEndpointIdOrCustomChainId && !!token.address,
  });

  const walletBalance = {
    customClientChainID: lzEndpointIdOrCustomChainId || 0,
    stakerAddress: userAddress as `0x${string}`,
    tokenID: token.address,
    value: balance?.data?.value || BigInt(0),
    decimals: balance?.data?.decimals || 0,
    symbol: balance?.data?.symbol || "",
  };

  const getQuote = useCallback(
    async (operation: OperationType): Promise<bigint> => {
      if (!contract) return BigInt(0);

      const lengths = {
        asset: 97,
        delegation: 138,
        undelegation: 139,
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
    async (amount: bigint, approvingTx?: (() => Promise<`0x${string}`>), options?: Pick<BaseTxOptions, "onPhaseChange">) => {
      if (!contract || !amount) throw new Error("Invalid parameters");
      const fee = await getQuote("asset");
      const spawnTx = () => contract.write.deposit([token.address, amount], { value: fee });
      const getBalanceSnapshot = async () => {
        const balance = await getStakerBalanceByToken(userAddress as `0x${string}`, lzEndpointIdOrCustomChainId, token.address);
        return balance?.totalDeposited || BigInt(0);
      };
      const verifyCompletion = async (totalDepositedBefore: bigint, totalDepositedAfter: bigint) => {
        return totalDepositedAfter === totalDepositedBefore + amount;
      };

      return handleEVMTxWithStatus(
        {
          approvingTx: approvingTx,
          spawnTx: spawnTx,
          mode: "simplex",
          publicClient: publicClient,
          verifyCompletion: verifyCompletion,
          getStateSnapshot: getBalanceSnapshot,
          onPhaseChange: options?.onPhaseChange,
          onSuccess: (result: { hash: string; success: boolean }) => {
            if (result.success) {
              console.log("Deposit succeeded, updating cached balances...");
              // Force update both Imuachain staker balance and client chain wallet balance
              stakerBalance.refetch();
              // Force refetch wallet balance for immediate update
              balance?.refetch();
            }
          },
        },
      );
    },
    [contract, token.address, getQuote],
  );

  const handleDelegateTo = useCallback(
    async (operator: string, amount: bigint, options?: Pick<BaseTxOptions, "onPhaseChange">) => {
      if (!contract || !amount || !operator)
        throw new Error("Invalid parameters");
      const fee = await getQuote("delegation");
      const spawnTx = () => contract.write.delegateTo([operator, token.address, amount], { value: fee });
      const getBalanceSnapshot = async () => {
        const balance = await getStakerBalanceByToken(userAddress as `0x${string}`, lzEndpointIdOrCustomChainId, token.address);
        return balance?.delegated || BigInt(0);
      };
      const verifyCompletion = async (delegatedBefore: bigint, delegatedAfter: bigint) => {
        return delegatedAfter === delegatedBefore + amount;
      };

      return handleEVMTxWithStatus(
        {
          spawnTx: spawnTx,
          mode: "simplex",
          publicClient: publicClient,
          verifyCompletion: verifyCompletion,
          getStateSnapshot: getBalanceSnapshot,
          onPhaseChange: options?.onPhaseChange,
          onSuccess: (result: { hash: string; success: boolean }) => {
            if (result.success) {
              console.log("Delegate succeeded, updating cached balances...");
              // Update Imuachain staker balance (delegated and claimable balances)
              stakerBalance.refetch();
              // Force update delegations to reflect new delegation amounts
              delegations.refetch();
            }
          },
        },
      );
    },
    [contract, token.address, getQuote],
  );

  const handleUndelegateFrom = useCallback(
    async (operator: string, amount: bigint, instantUnbond: boolean, options?: Pick<BaseTxOptions, "onPhaseChange">) => {
      if (!contract || !amount || !operator)
        throw new Error("Invalid parameters");
      const fee = await getQuote("undelegation");
      const spawnTx = () => contract.write.undelegateFrom([operator, token.address, amount, instantUnbond], {
        value: fee,
      });
      const getBalanceSnapshot = async () => {
        const balance = await getStakerBalanceByToken(userAddress as `0x${string}`, lzEndpointIdOrCustomChainId, token.address);
        return instantUnbond ? balance?.withdrawable : balance?.pendingUndelegated || BigInt(0);
      };

      const verifyCompletion = async (balanceBefore: bigint, BalanceAfter: bigint) => {
        return instantUnbond ? BalanceAfter > balanceBefore : BalanceAfter === balanceBefore + amount;
      };

      return handleEVMTxWithStatus(
        {
          spawnTx: spawnTx,
          mode: "simplex",
          publicClient: publicClient,
          verifyCompletion: verifyCompletion,
          getStateSnapshot: getBalanceSnapshot,
          onPhaseChange: options?.onPhaseChange,
          onSuccess: (result: { hash: string; success: boolean }) => {
            if (result.success) {
              console.log("Undelegate succeeded, updating cached balances...");
              // Update Imuachain staker balance (delegated, claimable, or pendingUndelegated)
              stakerBalance.refetch();
              // Force update delegations to reflect reduced delegation amounts
              delegations.refetch();
            }
          },
        },
      );
    },
    [contract, token.address, getQuote],
  );

  const handleDepositAndDelegate = useCallback(
    async (amount: bigint, operator: string, approvingTx?: (() => Promise<`0x${string}`>), options?: Pick<BaseTxOptions, "onPhaseChange">) => {
      if (!contract || !amount || !operator)
        throw new Error("Invalid parameters");
      const fee = await getQuote("delegation");

      const spawnTx = () => contract.write.depositThenDelegateTo([token.address, amount, operator], { value: fee });
      const getBalanceSnapshot = async () => {
        const balance = await getStakerBalanceByToken(userAddress as `0x${string}`, lzEndpointIdOrCustomChainId, token.address);
        return balance?.delegated || BigInt(0);
      };
      const verifyCompletion = async (delegatedBefore: bigint, delegatedAfter: bigint) => {
        return delegatedAfter === delegatedBefore + amount;
      };

      return handleEVMTxWithStatus(
        {
          approvingTx: approvingTx,
          spawnTx: spawnTx,
          mode: "simplex",
          publicClient: publicClient,
          verifyCompletion: verifyCompletion,
          getStateSnapshot: getBalanceSnapshot,
          onPhaseChange: options?.onPhaseChange,
          onSuccess: (result: { hash: string; success: boolean }) => {
            if (result.success) {
              console.log("Deposit and delegate succeeded, updating cached balances...");
              // Force update both Imuachain staker balance and client chain wallet balance
              stakerBalance.refetch();
              balance?.refetch();
              // Force update delegations to reflect new delegation amounts
              delegations.refetch();
            }
          },
        }
      );
    },
    [contract, token.address, getQuote],
  );

  const handleClaimPrincipal = useCallback(
    async (amount: bigint, options?: Pick<BaseTxOptions, "onPhaseChange">) => {
      if (!contract || !amount) throw new Error("Invalid parameters");
      const fee = await getQuote("asset");

      const spawnTx = () => contract.write.claimPrincipalFromImuachain([token.address, amount], { value: fee });
      const getBalanceSnapshot = async () => {
        const withdrawable = await vault?.read.getWithdrawableBalance([userAddress as `0x${string}`]);
        return withdrawable || BigInt(0);
      };

      // Claiming amount will be added to withdrawable balance
      const verifyCompletion = async (withdrawableBefore: bigint, withdrawableAfter: bigint) => {
        return withdrawableAfter === withdrawableBefore + amount;
      };

      return handleEVMTxWithStatus(
        {
          spawnTx: spawnTx,
          mode: "duplex",
          publicClient: publicClient,
          verifyCompletion: verifyCompletion,
          getStateSnapshot: getBalanceSnapshot,
          onPhaseChange: options?.onPhaseChange,
          onSuccess: (result: { hash: string; success: boolean }) => {
            if (result.success) {
              console.log("Claim succeeded, updating cached balances...");
              // Force update withdrawable amount from vault
              withdrawableAmountFromVault.refetch();
              // Force update both Imuachain staker balance and client chain vault withdrawable balance
              stakerBalance.refetch();
            }
          },
        }
      );
    },
    [contract, token.address, getQuote],
  );

  const handleWithdrawPrincipal = useCallback(
    async (
      amount: bigint,
      recipient?: `0x${string}`,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      if (!contract || !amount || !recipient)
        throw new Error("Invalid parameters");
      
      const spawnTx = () => contract.write.withdrawPrincipal([token.address, amount, recipient]);
      const getBalanceSnapshot = async () => {
        const withdrawable = await vault?.read.getWithdrawableBalance([userAddress as `0x${string}`]);
        return withdrawable || BigInt(0);
      };
      const verifyCompletion = async (withdrawableBefore: bigint, withdrawableAfter: bigint) => {
        return withdrawableAfter + amount === withdrawableBefore;
      };

      return handleEVMTxWithStatus(
        {
          spawnTx: spawnTx,
          mode: "local",
          publicClient: publicClient,
          verifyCompletion: verifyCompletion,
          getStateSnapshot: getBalanceSnapshot,
          onPhaseChange: options?.onPhaseChange,
          onSuccess: (result: { hash: string; success: boolean }) => {
            if (result.success) {
              console.log("Withdraw succeeded, updating cached balances...");
              // Force update client chain vault withdrawable balance and wallet balance
              // Note: stakerBalance.withdrawable will automatically reflect the updated vault balance
              balance?.refetch();
              withdrawableAmountFromVault.refetch();
            }
          },
        }
      );
    },
    [contract, token.address],
  );

  const handleStakeWithApproval = useCallback(
    async (
      amount: bigint,
      operatorAddress?: string,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      if (
        !contract ||
        !erc20Contract ||
        !amount ||
        !publicClient ||
        !vaultAddress
      )
        throw new Error("Invalid parameters");

      try {
        // Check allowance using token contract
        const currentAllowance = await erc20Contract?.read.allowance([
          userAddress as `0x${string}`,
          vaultAddress,
        ]);

        let approvingTx: (() => Promise<`0x${string}`>) | undefined = undefined;
        if (currentAllowance < amount) {
          approvingTx = () => erc20Contract.write.approve([
            vaultAddress,
            maxUint256,
          ]);
        }

        // Proceed with stake/deposit
        return operatorAddress
          ? handleDepositAndDelegate(amount, operatorAddress, approvingTx, options)
          : handleDeposit(amount, approvingTx, options);
      } catch (error) {
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
