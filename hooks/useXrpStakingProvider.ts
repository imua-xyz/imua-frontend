"use client";

import { useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { encodePacked } from "viem";
import { useUTXOGateway } from "./useUTXOGateway";
import { useXrplClient } from "./useXrplClient";
import { useAssetsPrecompile } from "./useAssetsPrecompile";
import { useTxUtils } from "./useTxUtils";
import {
  TxHandlerOptions,
  StakerBalance,
  XRPStakingContext,
  StakingProvider,
  WalletBalance,
} from "@/types/staking";
import {
  XRP_CHAIN_ID,
  XRP_TOKEN_ENUM,
  XRP_TOKEN_ADDRESS,
  XRP_VAULT_ADDRESS,
  XRP_STAKING_DESTINATION_TAG,
} from "@/config/xrp";
import { getMetadataByEvmChainID } from "@/config/stakingPortals";
import { MINIMUM_STAKE_AMOUNT_DROPS } from "@/config/xrp";

export function useXrpStakingProvider(
  stakingContext: XRPStakingContext,
): StakingProvider {
  const { address: evmAddress } = useAccount();
  const isGemWalletConnected = stakingContext.isConnected;
  const isStakingEnabled = stakingContext.isStakingEnabled;
  const xrpAddress = stakingContext.userAddress;
  const network = stakingContext.network;
  const sendTransaction = stakingContext.sendTransaction;
  const metadata = getMetadataByEvmChainID(XRP_CHAIN_ID);

  const xrplClient = useXrplClient();

  const { contract, isUTXOGatewayAvailable } = useUTXOGateway();
  const { getStakerBalanceByToken } = useAssetsPrecompile();
  const { handleEVMTxWithStatus, handleXrplTxWithStatus } = useTxUtils();

  // Fetch staking position
  const stakerBalance = useQuery({
    queryKey: ["stakerBalance", xrpAddress],
    queryFn: async (): Promise<StakerBalance> => {
      if (!xrpAddress || !contract) {
        throw new Error("Required dependencies not available");
      }

      try {
        // First get binded evm address for the xrp address
        const bindedEvmAddress = await contract?.read.getImuachainAddress([
          XRP_CHAIN_ID,
          xrpAddress,
        ]);
        if (!bindedEvmAddress) {
          throw new Error("No bound EVM address found");
        }

        // Get staker balance from Assets Precompile
        const { success, stakerBalanceResponse } =
          await getStakerBalanceByToken(
            bindedEvmAddress as `0x${string}`,
            XRP_CHAIN_ID,
            XRP_TOKEN_ADDRESS,
          );

        if (!success || !stakerBalanceResponse) {
          throw new Error("Failed to fetch staker balance");
        }

        return {
          clientChainID: stakerBalanceResponse.clientChainID,
          stakerAddress: stakerBalanceResponse.stakerAddress,
          tokenID: stakerBalanceResponse.tokenID,
          totalBalance: stakerBalanceResponse.balance,
          withdrawable: stakerBalanceResponse.withdrawable,
          delegated: stakerBalanceResponse.delegated,
          pendingUndelegated: stakerBalanceResponse.pendingUndelegated,
          totalDeposited: stakerBalanceResponse.totalDeposited,
        };
      } catch (error) {
        console.error("Error fetching staking position:", error);
        throw error; // Let React Query handle the error
      }
    },
    refetchInterval: 30000,
    enabled: isStakingEnabled && !!xrpAddress && !!contract,
  });

  const walletBalance = useQuery({
    queryKey: ["walletBalance", xrpAddress],
    queryFn: async (): Promise<WalletBalance | undefined> => {
      if (!xrpAddress || !xrplClient) return undefined;
      const accountInfo = await xrplClient.getAccountInfo(xrpAddress);
      if (!accountInfo.success) return undefined;
      return {
        customClientChainID: XRP_CHAIN_ID,
        stakerAddress: xrpAddress,
        tokenID: XRP_TOKEN_ADDRESS,
        value: accountInfo.data?.balance || BigInt(0),
        decimals: 6,
        symbol: "XRP",
      };
    },
    enabled: !!xrpAddress && !!xrplClient && xrplClient.isConnected,
  });

  // Stake XRP
  const stakeXrp = useCallback(
    async (
      amount: bigint,
      vaultAddress: `0x${string}`,
      operatorAddress?: string,
      options?: TxHandlerOptions,
    ) => {
      if (!isGemWalletConnected || !xrpAddress)
        throw new Error("Gem wallet not connected");
      if (!vaultAddress || !amount) throw new Error("Invalid parameters");
      if (operatorAddress)
        throw new Error("Operator address not supported for now");

      // Get account info using the xrplClient
      const accountInfo = await xrplClient.getAccountInfo(xrpAddress);
      if (!accountInfo.success) throw new Error("Failed to fetch account info");

      const memoData = evmAddress
        ? Buffer.from(evmAddress, "utf8").toString("hex")
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

      return handleXrplTxWithStatus(sendTransaction(txPayload), options);
    },
    [
      isGemWalletConnected,
      xrpAddress,
      evmAddress,
      xrplClient,
      handleXrplTxWithStatus,
      sendTransaction,
    ],
  );

  // Get relaying fee
  const getQuote = useCallback(async (): Promise<bigint> => {
    return BigInt(0); // 12 drops in XRP
  }, []);

  // Delegate XRP to an operator
  const delegateXrp = useCallback(
    async (operator: string, amount: bigint, options?: TxHandlerOptions) => {
      if (!contract) throw new Error("Contract not available");
      if (!operator || !amount) throw new Error("Invalid parameters");

      return handleEVMTxWithStatus(
        contract.write.delegateTo([XRP_TOKEN_ENUM, operator, amount]),
        options,
      );
    },
    [contract, handleEVMTxWithStatus],
  );

  // Undelegate XRP from an operator
  const undelegateXrp = useCallback(
    async (operator: string, amount: bigint, options?: TxHandlerOptions) => {
      if (!contract) throw new Error("Contract not available");
      if (!operator || !amount) throw new Error("Invalid parameters");

      return handleEVMTxWithStatus(
        contract.write.undelegateFrom([XRP_TOKEN_ENUM, operator, amount]),
        options,
      );
    },
    [contract, handleEVMTxWithStatus],
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
        options,
      );
    },
    [contract, handleEVMTxWithStatus],
  );

  return {
    stake: stakeXrp,
    delegateTo: delegateXrp,
    undelegateFrom: undelegateXrp,
    withdrawPrincipal: withdrawXrp,
    getQuote,
    stakerBalance: stakerBalance?.data,
    walletBalance: walletBalance?.data,
    isWalletConnected: isGemWalletConnected,
    isStakingEnabled: isStakingEnabled,
    vaultAddress: XRP_VAULT_ADDRESS,
    metadata: metadata,
    minimumStakeAmount: BigInt(MINIMUM_STAKE_AMOUNT_DROPS),
    isDepositThenDelegateDisabled: true,
  };
}
