"use client";

import { useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { BaseTxOptions, StakerBalance, WalletBalance } from "@/types/staking";
import {
  XRP_CHAIN_ID,
  XRP_TOKEN_ENUM,
  XRP_TOKEN_ADDRESS,
  XRP_VAULT_ADDRESS,
  XRP_STAKING_DESTINATION_TAG,
} from "@/config/xrp";
import { MINIMUM_STAKE_AMOUNT_DROPS } from "@/config/xrp";
import { StakingService } from "@/types/staking-service";
import { xrp } from "@/types/tokens";
import { useGemWalletStore } from "@/stores/gemWalletClient";
import { useBindingStore } from "@/stores/bindingClient";
import { usePortalContract } from "./usePortalContract";
import { useXrplStore } from "@/stores/xrplClient";
import { handleEVMTxWithStatus, handleXrplTxWithStatus } from "@/lib/txUtils";
import { useStakerBalances } from "./useStakerBalances";
import { useAssetsPrecompile } from "./useAssetsPrecompile";
import { useBootstrapStatus } from "./useBootstrapStatus";

export function useXRPStaking(): StakingService {
  const vaultAddress = XRP_VAULT_ADDRESS;
  const isGemWalletConnected = useGemWalletStore(
    (state) => state.isWalletConnected,
  );
  const xrpAddress = useGemWalletStore((state) => state.userAddress);
  const walletNetwork = useGemWalletStore((state) => state.walletNetwork);

  const sendTransaction = useGemWalletStore((state) => state.sendTransaction);
  const getTransactionStatus = useXrplStore(
    (state) => state.getTransactionStatus,
  );

  const checkBoundAddress = useBindingStore((state) => state.checkBinding);
  const setBoundAddress = useBindingStore((state) => state.setBinding);
  const boundImuaAddress = useBindingStore(
    (state) => state.boundAddresses[xrpAddress ?? ""],
  );

  const xrplClient = useXrplStore((state) => state.client);
  const setNetwork = useXrplStore((state) => state.setNetwork);

  const { getStakerBalanceByToken } = useAssetsPrecompile();
  const { bootstrapStatus } = useBootstrapStatus();

  useEffect(() => {
    if (walletNetwork) {
      setNetwork(walletNetwork);
    }
  }, [walletNetwork, setNetwork]);

  const getAccountInfo = useXrplStore((state) => state.getAccountInfo);

  const { contract, publicClient } = usePortalContract(xrp.network);
  const { address: evmAddress, isConnected: isWagmiConnected } = useAccount();

  const [stakerBalanceResponse] = useStakerBalances([xrp]);

  // Fetch staking position
  const stakerBalance = useQuery({
    queryKey: ["stakerBalanceForXRP", xrpAddress],
    queryFn: async (): Promise<StakerBalance> => {
      if (!xrpAddress) {
        throw new Error("Required dependencies not available");
      }

      try {
        if (!boundImuaAddress) {
          return {
            clientChainID: XRP_CHAIN_ID,
            stakerAddress: "0x0" as `0x${string}`,
            tokenID: XRP_TOKEN_ADDRESS,
            totalBalance: BigInt(0),
            withdrawable: BigInt(0),
            delegated: BigInt(0),
            pendingUndelegated: BigInt(0),
            totalDeposited: BigInt(0),
          };
        }

        if (!stakerBalanceResponse.data)
          throw new Error("Failed to fetch staker balance");

        return {
          clientChainID: stakerBalanceResponse.data.clientChainID,
          stakerAddress: stakerBalanceResponse.data.stakerAddress,
          tokenID: stakerBalanceResponse.data.tokenID,
          totalBalance: stakerBalanceResponse.data.balance,
          withdrawable: stakerBalanceResponse.data.withdrawable || BigInt(0),
          delegated: stakerBalanceResponse.data.delegated,
          pendingUndelegated: stakerBalanceResponse.data.pendingUndelegated,
          totalDeposited: stakerBalanceResponse.data.totalDeposited,
        };
      } catch (error) {
        console.error("Error fetching staking position:", error);
        throw error; // Let React Query handle the error
      }
    },
    refetchInterval: 3000,
    enabled: !!xrpAddress,
  });

  const walletBalance = useQuery({
    queryKey: ["walletBalance", xrpAddress],
    queryFn: async (): Promise<WalletBalance | undefined> => {
      if (!xrpAddress) throw new Error("Required dependencies not available");
      const accountInfo = await getAccountInfo(xrpAddress);
      if (!accountInfo.success) throw new Error("Failed to fetch account info");
      return {
        customClientChainID: XRP_CHAIN_ID,
        stakerAddress: xrpAddress,
        tokenID: XRP_TOKEN_ADDRESS,
        value: accountInfo.data?.balance || BigInt(0),
        decimals: 6,
        symbol: "XRP",
      };
    },
    enabled: !!xrpAddress && !!getAccountInfo,
  });

  // Stake XRP
  const stakeXrp = useCallback(
    async (
      amount: bigint,
      operatorAddress?: string,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      const bootstrapped = bootstrapStatus?.isBootstrapped;
      if ( bootstrapped === undefined) throw new Error("Bootstrap status not available");
      if (!isGemWalletConnected || !isWagmiConnected || !xrpAddress)
        throw new Error("Gem wallet not connected");
      if (!vaultAddress || !amount) throw new Error("Invalid parameters");
      if ((bootstrapped && operatorAddress) || (!bootstrapped && !operatorAddress))
        throw new Error(bootstrapped ? "Operator address not supported for now" : "Operator address is required for now");
      if (!evmAddress) throw new Error("EVM wallet not connected");
      if (boundImuaAddress && boundImuaAddress !== evmAddress)
        throw new Error("EVM wallet address does not match bound address");

      // Get account info using the xrplClient
      const accountInfo = await getAccountInfo(xrpAddress);
      if (!accountInfo.success) throw new Error("Failed to fetch account info");

      // Determine which address to use for memo data
      // 1. If boundImuaAddress exists, use that
      // 2. If not and evmAddress exists, use the connected EVM wallet address
      // 3. Otherwise, leave it empty
      let memoAddress = "";
      let effectiveAddress: `0x${string}` | null = null;

      if (boundImuaAddress) {
        // Use the already bound address (priority)
        memoAddress = boundImuaAddress;
        effectiveAddress = boundImuaAddress;
      } else if (evmAddress) {
        // Fallback to connected EVM wallet address
        memoAddress = evmAddress;
        effectiveAddress = evmAddress as `0x${string}`;
      }

      if (!memoAddress) throw new Error("Memo address not found");
      
      // if it is not bootstrapped, we should encode the operator address after memo address into the memo data
      let memoData: string = "";
      if (!bootstrapped) {
        memoData = Buffer.from(memoAddress + operatorAddress, "utf8").toString("hex");
      } else {
        memoData = Buffer.from(memoAddress, "utf8").toString("hex");
      }

      const txPayload = {
        transactionType: "Payment",
        account: xrpAddress,
        destination: vaultAddress,
        amount: String(amount),
        destinationTag: XRP_STAKING_DESTINATION_TAG,
        memos: [
          {
            memo: {
              memoType: "4465736372697074696F6E",
              memoData: memoData,
            },
          },
        ],
      };

      const spawnTx = () => sendTransaction(txPayload);
      const getStateSnapshot = async () => {
        const balance = await getStakerBalanceByToken(
          effectiveAddress as `0x${string}`,
          XRP_CHAIN_ID,
          XRP_TOKEN_ADDRESS,
        );
        return balance?.totalDeposited || BigInt(0);
      };
      const verifyCompletion = async (
        balanceBefore: bigint,
        balanceAfter: bigint,
      ) => {
        return balanceAfter === balanceBefore + amount;
      };
      const onSuccess = (result: { hash: string; success: boolean }) => {
        if (result.success) {
          console.log("Stake succeeded, updating cached balances...");
          stakerBalance.refetch();
          walletBalance.refetch();
        }
      };

      const { hash, success, error } = await handleXrplTxWithStatus({
        spawnTx: spawnTx,
        mode: "simplex",
        getTransactionStatus: getTransactionStatus,
        verifyCompletion: verifyCompletion,
        getStateSnapshot: getStateSnapshot,
        onPhaseChange: options?.onPhaseChange,
        onSuccess: onSuccess,
        utxoGateway: contract,
      });

      // If transaction and following checks were successful and we don't have a bound address yet, we should explicitly set the bound address
      if (success && !boundImuaAddress && effectiveAddress) {
        // Given even the completion verification has been successful, we should explicitly set the bound address
        setBoundAddress(xrpAddress, effectiveAddress);
      }

      return { hash, success, error };
    },
    [
      vaultAddress,
      isGemWalletConnected,
      isWagmiConnected,
      xrpAddress,
      evmAddress,
      xrplClient,
      boundImuaAddress,
      checkBoundAddress,
      sendTransaction,
    ],
  );

  // Get relaying fee
  const getQuote = useCallback(async (): Promise<bigint> => {
    return BigInt(0);
  }, []);

  // Delegate XRP to an operator
  const delegateXrp = useCallback(
    async (
      operator: string,
      amount: bigint,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      if (!contract || !boundImuaAddress)
        throw new Error("Contract not available or bound address not found");
      if (!operator || !amount) throw new Error("Invalid parameters");
      if (evmAddress && evmAddress !== boundImuaAddress)
        throw new Error("EVM wallet address does not match bound address");
      if (!bootstrapStatus?.isBootstrapped)
        throw new Error("Cannot delegate before bootstrap");

      const spawnTx = () =>
        contract.write.delegateTo([XRP_TOKEN_ENUM, operator, amount]);
      const getStateSnapshot = async () => {
        const balance = await getStakerBalanceByToken(
          boundImuaAddress,
          XRP_CHAIN_ID,
          XRP_TOKEN_ADDRESS,
        );
        return balance?.delegated || BigInt(0);
      };
      const verifyCompletion = async (
        delegatedBefore: bigint,
        delegatedAfter: bigint,
      ) => {
        return delegatedAfter === delegatedBefore + amount;
      };
      const onSuccess = (result: { hash: string; success: boolean }) => {
        if (result.success) {
          console.log("Delegate succeeded, updating cached balances...");
          stakerBalance.refetch();
        }
      };

      return handleEVMTxWithStatus({
        spawnTx: spawnTx,
        mode: "local",
        publicClient: publicClient,
        verifyCompletion: verifyCompletion,
        getStateSnapshot: getStateSnapshot,
        onPhaseChange: options?.onPhaseChange,
        onSuccess: onSuccess,
      });
    },
    [contract, handleEVMTxWithStatus, publicClient],
  );

  // Undelegate XRP from an operator
  const undelegateXrp = useCallback(
    async (
      operator: string,
      amount: bigint,
      instantUnbond: boolean,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      if (!contract || !boundImuaAddress)
        throw new Error("Contract not available or bound address not found");
      if (!operator || !amount) throw new Error("Invalid parameters");
      if (evmAddress && evmAddress !== boundImuaAddress)
        throw new Error("EVM wallet address does not match bound address");
      if (!bootstrapStatus?.isBootstrapped)
        throw new Error("Cannot undelegate before bootstrap");

      const spawnTx = () =>
        contract.write.undelegateFrom([
          XRP_TOKEN_ENUM,
          operator,
          amount,
          instantUnbond,
        ]);
      const getStateSnapshot = async () => {
        const balance = await getStakerBalanceByToken(
          boundImuaAddress,
          XRP_CHAIN_ID,
          XRP_TOKEN_ADDRESS,
        );
        return instantUnbond
          ? balance?.withdrawable
          : balance?.pendingUndelegated || BigInt(0);
      };

      const verifyCompletion = async (
        balanceBefore: bigint,
        BalanceAfter: bigint,
      ) => {
        return instantUnbond
          ? BalanceAfter > balanceBefore
          : BalanceAfter === balanceBefore + amount;
      };

      const onSuccess = (result: { hash: string; success: boolean }) => {
        if (result.success) {
          console.log("Undelegate succeeded, updating cached balances...");
          stakerBalance.refetch();
        }
      };

      return handleEVMTxWithStatus({
        spawnTx: spawnTx,
        mode: "local",
        publicClient: publicClient,
        verifyCompletion: verifyCompletion,
        getStateSnapshot: getStateSnapshot,
        onPhaseChange: options?.onPhaseChange,
        onSuccess: onSuccess,
      });
    },
    [contract, handleEVMTxWithStatus, publicClient],
  );

  // Withdraw XRP from staking
  const withdrawXrp = useCallback(
    async (
      amount: bigint,
      recipient?: `0x${string}`,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      if (!contract || !boundImuaAddress)
        throw new Error("Contract not available or bound address not found");
      if (!amount) throw new Error("Invalid parameters");
      if (recipient) throw new Error("Recipient not supported for now");
      if (evmAddress && evmAddress !== boundImuaAddress)
        throw new Error("EVM wallet address does not match bound address");
      if (!bootstrapStatus?.isBootstrapped)
        throw new Error("Cannot withdraw before bootstrap");

      const spawnTx = () =>
        contract.write.withdrawPrincipal([XRP_TOKEN_ENUM, amount]);
      const getStateSnapshot = async () => {
        const balance = await getStakerBalanceByToken(
          boundImuaAddress,
          XRP_CHAIN_ID,
          XRP_TOKEN_ADDRESS,
        );
        return balance?.withdrawable || BigInt(0);
      };
      const verifyCompletion = async (
        balanceBefore: bigint,
        balanceAfter: bigint,
      ) => {
        return balanceAfter === balanceBefore - amount;
      };
      const onSuccess = (result: { hash: string; success: boolean }) => {
        if (result.success) {
          console.log("Withdraw succeeded, updating cached balances...");
          stakerBalance.refetch();
        }
      };

      return handleEVMTxWithStatus({
        spawnTx: spawnTx,
        mode: "local",
        publicClient: publicClient,
        verifyCompletion: verifyCompletion,
        getStateSnapshot: getStateSnapshot,
        onPhaseChange: options?.onPhaseChange,
        onSuccess: onSuccess,
      });
    },
    [contract, handleEVMTxWithStatus, publicClient],
  );

  return {
    token: xrp,
    stake: stakeXrp,
    delegateTo: delegateXrp,
    undelegateFrom: undelegateXrp,
    withdrawPrincipal: withdrawXrp,
    getQuote,
    stakerBalance: stakerBalance?.data,
    walletBalance: walletBalance?.data,
    vaultAddress: vaultAddress,
    minimumStakeAmount: BigInt(MINIMUM_STAKE_AMOUNT_DROPS),
    isDepositThenDelegateDisabled: !bootstrapStatus?.isBootstrapped,
  };
}
