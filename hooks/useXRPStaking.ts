"use client";

import { useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import {
  TxHandlerOptions,
  StakerBalance,
  WalletBalance,
} from "@/types/staking";
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
  const boundImuaAddress = useBindingStore(
    (state) => state.boundAddresses[xrpAddress ?? ""],
  );

  const xrplClient = useXrplStore((state) => state.client);
  const setNetwork = useXrplStore((state) => state.setNetwork);

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
      options?: TxHandlerOptions,
    ) => {
      if (!isGemWalletConnected || !isWagmiConnected || !xrpAddress)
        throw new Error("Gem wallet not connected");
      if (!vaultAddress || !amount) throw new Error("Invalid parameters");
      if (operatorAddress)
        throw new Error("Operator address not supported for now");

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

      const memoData = memoAddress
        ? Buffer.from(memoAddress, "utf8").toString("hex")
        : "";

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

      const { hash, success, error } = await handleXrplTxWithStatus(
        sendTransaction(txPayload),
        getTransactionStatus,
        options,
      );

      // If transaction was successful and:
      // 1. We don't have a bound address yet
      // 2. We used the EVM address in the memo
      // 3. We have the checkBoundAddress method available
      if (success && !boundImuaAddress && effectiveAddress) {
        // Schedule binding checks after successful deposit
        setTimeout(async () => {
          await checkBoundAddress(xrpAddress);

          // Check again after a longer delay if still not found
          setTimeout(async () => {
            await checkBoundAddress(xrpAddress);
          }, 15000); // Second check after 15 seconds
        }, 5000); // First check after 5 seconds
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
      handleXrplTxWithStatus,
      sendTransaction,
    ],
  );

  // Get relaying fee
  const getQuote = useCallback(async (): Promise<bigint> => {
    return BigInt(0);
  }, []);

  // Delegate XRP to an operator
  const delegateXrp = useCallback(
    async (operator: string, amount: bigint, options?: TxHandlerOptions) => {
      if (!contract) throw new Error("Contract not available");
      if (!operator || !amount) throw new Error("Invalid parameters");

      return handleEVMTxWithStatus(
        contract.write.delegateTo([XRP_TOKEN_ENUM, operator, amount]),
        publicClient,
        options,
      );
    },
    [contract, handleEVMTxWithStatus, publicClient],
  );

  // Undelegate XRP from an operator
  const undelegateXrp = useCallback(
    async (operator: string, amount: bigint, instantUnbond: boolean, options?: TxHandlerOptions) => {
      if (!contract) throw new Error("Contract not available");
      if (!operator || !amount) throw new Error("Invalid parameters");

      return handleEVMTxWithStatus(
        contract.write.undelegateFrom([XRP_TOKEN_ENUM, operator, amount, instantUnbond]),
        publicClient,
        options,
      );
    },
    [contract, handleEVMTxWithStatus, publicClient],
  );

  // Withdraw XRP from staking
  const withdrawXrp = useCallback(
    async (
      amount: bigint,
      recipient?: `0x${string}`,
      options?: TxHandlerOptions,
    ) => {
      if (!contract) throw new Error("Contract not available");
      if (!amount) throw new Error("Invalid parameters");
      if (recipient) throw new Error("Recipient not supported for now");

      return handleEVMTxWithStatus(
        contract.write.withdrawPrincipal([XRP_TOKEN_ENUM, amount]),
        publicClient,
        options,
      );
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
    isDepositThenDelegateDisabled: true,
  };
}
