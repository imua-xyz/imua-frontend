"use client";

import { useCallback, useEffect, useMemo } from "react";
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

  const setBoundAddress = useBindingStore((state) => state.setBinding);
  const boundImuaAddress = useBindingStore(
    (state) => state.boundAddresses[xrpAddress ?? ""],
  );

  const setNetwork = useXrplStore((state) => state.setNetwork);

  const { bootstrapStatus } = useBootstrapStatus();

  useEffect(() => {
    if (walletNetwork) {
      setNetwork(walletNetwork);
    }
  }, [walletNetwork, setNetwork]);

  const getAccountInfo = useXrplStore((state) => state.getAccountInfo);

  const { readonlyContract, writeableContract, publicClient } =
    usePortalContract(xrp.network);
  const { address: evmAddress, isConnected: isWagmiConnected } = useAccount();

  const [stakerBalanceResponse] = useStakerBalances([xrp]);

  const stakerBalance = useMemo<StakerBalance | undefined>(() => {
    const s = stakerBalanceResponse.data;
    if (!s) return undefined;
    return {
      clientChainID: s.clientChainID,
      stakerAddress: s.stakerAddress,
      tokenID: s.tokenID,
      totalBalance: s.balance,
      withdrawable: s.withdrawable,
      delegated: s.delegated,
      pendingUndelegated: s.pendingUndelegated,
      totalDeposited: s.totalDeposited,
    };
  }, [stakerBalanceResponse.data]);

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
      if (bootstrapped === undefined)
        throw new Error("Bootstrap status not available");
      if (!isGemWalletConnected || !isWagmiConnected || !xrpAddress)
        throw new Error("Gem wallet not connected");
      if (!vaultAddress || !amount) throw new Error("Invalid parameters");
      if (
        (bootstrapped && operatorAddress) ||
        (!bootstrapped && !operatorAddress)
      )
        throw new Error(
          bootstrapped
            ? "Operator address not supported for now"
            : "Operator address is required for now",
        );
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
        if (!operatorAddress)
          throw new Error("Operator address is required for bootstrap phase");
        // Remove 0x prefix from EVM address before encoding, and operator address is bech32 encoded starting with im
        const cleanMemoAddress = memoAddress.startsWith("0x")
          ? memoAddress.slice(2)
          : memoAddress;
        memoData = Buffer.from(
          cleanMemoAddress + operatorAddress,
          "utf8",
        ).toString("hex");
      } else {
        // Remove 0x prefix from EVM address before encoding
        const cleanMemoAddress = memoAddress.startsWith("0x")
          ? memoAddress.slice(2)
          : memoAddress;
        memoData = Buffer.from(cleanMemoAddress, "utf8").toString("hex");
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
        await stakerBalanceResponse.refetch();
        return stakerBalanceResponse.data?.totalDeposited || BigInt(0);
      };
      const verifyCompletion = async (
        balanceBefore: bigint,
        balanceAfter: bigint,
      ) => {
        return bootstrapped ? balanceAfter === balanceBefore + amount : true;
      };
      const onSuccess = (result: { hash: string; success: boolean }) => {
        if (result.success) {
          console.log("Stake succeeded, updating cached balances...");
          stakerBalanceResponse.refetch();
          walletBalance.refetch();
        }
      };

      const { hash, success, error } = await handleXrplTxWithStatus({
        spawnTx: spawnTx,
        mode: bootstrapped ? "simplex" : "local",
        getTransactionStatus: getTransactionStatus,
        verifyCompletion: verifyCompletion,
        getStateSnapshot: getStateSnapshot,
        onPhaseChange: options?.onPhaseChange,
        onSuccess: onSuccess,
        utxoGateway: readonlyContract,
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
      boundImuaAddress,
      sendTransaction,
      bootstrapStatus?.isBootstrapped,
      stakerBalanceResponse,
      walletBalance,
      getAccountInfo,
      setBoundAddress,
      getTransactionStatus,
      readonlyContract,
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
      if (!writeableContract || !boundImuaAddress)
        throw new Error("Contract not available or bound address not found");
      if (!operator || !amount) throw new Error("Invalid parameters");
      if (evmAddress && evmAddress !== boundImuaAddress)
        throw new Error("EVM wallet address does not match bound address");
      if (!bootstrapStatus?.isBootstrapped)
        throw new Error("Cannot delegate before bootstrap");

      const spawnTx = () =>
        writeableContract.write.delegateTo([XRP_TOKEN_ENUM, operator, amount]);
      const getStateSnapshot = async () => {
        await stakerBalanceResponse.refetch();
        return stakerBalanceResponse.data?.delegated || BigInt(0);
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
          stakerBalanceResponse.refetch();
        }
      };

      if (!publicClient) throw new Error("Public client not found");

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
    [
      writeableContract,
      publicClient,
      stakerBalanceResponse,
      evmAddress,
      bootstrapStatus?.isBootstrapped,
      boundImuaAddress,
    ],
  );

  // Undelegate XRP from an operator
  const undelegateXrp = useCallback(
    async (
      operator: string,
      amount: bigint,
      instantUnbond: boolean,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      if (!writeableContract || !boundImuaAddress)
        throw new Error("Contract not available or bound address not found");
      if (!operator || !amount) throw new Error("Invalid parameters");
      if (evmAddress && evmAddress !== boundImuaAddress)
        throw new Error("EVM wallet address does not match bound address");
      if (!bootstrapStatus?.isBootstrapped)
        throw new Error("Cannot undelegate before bootstrap");

      const spawnTx = () =>
        writeableContract.write.undelegateFrom([
          XRP_TOKEN_ENUM,
          operator,
          amount,
          instantUnbond,
        ]);
      const getStateSnapshot = async () => {
        await stakerBalanceResponse.refetch();
        return instantUnbond
          ? stakerBalanceResponse.data?.withdrawable
          : stakerBalanceResponse.data?.pendingUndelegated || BigInt(0);
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
          stakerBalanceResponse.refetch();
        }
      };

      if (!publicClient) throw new Error("Public client not found");

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
    [
      writeableContract,
      publicClient,
      stakerBalanceResponse,
      evmAddress,
      bootstrapStatus?.isBootstrapped,
      boundImuaAddress,
    ],
  );

  // Withdraw XRP from staking
  const withdrawXrp = useCallback(
    async (
      amount: bigint,
      recipient?: `0x${string}`,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      if (!writeableContract || !boundImuaAddress)
        throw new Error("Contract not available or bound address not found");
      if (!amount) throw new Error("Invalid parameters");
      if (recipient) throw new Error("Recipient not supported for now");
      if (evmAddress && evmAddress !== boundImuaAddress)
        throw new Error("EVM wallet address does not match bound address");
      if (!bootstrapStatus?.isBootstrapped)
        throw new Error("Cannot withdraw before bootstrap");

      const spawnTx = () =>
        writeableContract.write.withdrawPrincipal([XRP_TOKEN_ENUM, amount]);
      const getStateSnapshot = async () => {
        await stakerBalanceResponse.refetch();
        return stakerBalanceResponse.data?.withdrawable || BigInt(0);
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
          stakerBalanceResponse.refetch();
        }
      };

      if (!publicClient) throw new Error("Public client not found");

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
    [
      writeableContract,
      publicClient,
      stakerBalanceResponse,
      evmAddress,
      bootstrapStatus?.isBootstrapped,
      boundImuaAddress,
    ],
  );

  return {
    token: xrp,
    stake: stakeXrp,
    delegateTo: delegateXrp,
    undelegateFrom: undelegateXrp,
    withdrawPrincipal: withdrawXrp,
    getQuote,
    stakerBalance: stakerBalance,
    walletBalance: walletBalance?.data,
    vaultAddress: vaultAddress,
    minimumStakeAmount: BigInt(MINIMUM_STAKE_AMOUNT_DROPS),
    isDepositThenDelegateDisabled: bootstrapStatus?.isBootstrapped,
    isOnlyDepositThenDelegateAllowed: !bootstrapStatus?.isBootstrapped,
  };
}
