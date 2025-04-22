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
} from "@/config/xrp";
import { getMetadataByEvmChainID } from "@/config/stakingPortals";

// Helper function to generate a random destination tag
const generateDestinationTag = (): number => {
  return Math.floor(10000000 + Math.random() * 90000000);
};

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

  // Connect to XRP network when network changes
  useEffect(() => {
    if (network) {
      xrplClient.connect(network);
    }
  }, [network?.websocket, xrplClient]);

  const { contract, isUTXOGatewayAvailable } = useUTXOGateway();
  const { getStakerBalanceByToken } = useAssetsPrecompile();
  const { handleEVMTxWithStatus, handleXrplTxWithStatus } = useTxUtils();

  console.log("DEBUG: is utxogateway available", isUTXOGatewayAvailable);

  // Fetch staking position
  const stakerBalance = isStakingEnabled
    ? useQuery({
        queryKey: ["stakerBalance", xrpAddress],
        queryFn: async (): Promise<StakerBalance | undefined> => {
          if (!xrpAddress || !contract) return undefined;

          try {
            // First get binded evm address for the xrp address
            const bindedEvmAddress = await contract?.read.getImuachainAddress([
              XRP_CHAIN_ID,
              xrpAddress,
            ]);
            if (!bindedEvmAddress) return undefined;

            // Get staker balance from Assets Precompile
            const { success, stakerBalanceResponse } =
              await getStakerBalanceByToken(
                bindedEvmAddress as `0x${string}`,
                XRP_CHAIN_ID,
                XRP_TOKEN_ADDRESS,
              );

            if (!success || !stakerBalanceResponse) return undefined;
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
            return undefined;
          }
        },
        refetchInterval: 30000,
        enabled: !!xrpAddress && !!contract,
      })
    : undefined;

  const walletBalance = useQuery({
    queryKey: ["walletBalance", xrpAddress],
    queryFn: async (): Promise<WalletBalance | undefined> => {
      if (!xrpAddress || !xrplClient) return undefined;
      const accountInfo = await xrplClient.getAccountInfo(xrpAddress);
      console.log("DEBUG: walletBalance accountInfo", accountInfo);
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

      const destinationTag = generateDestinationTag();
      const memoData = evmAddress
        ? encodePacked(["address"], [evmAddress]).slice(2)
        : "";

      const txPayload = {
        TransactionType: "Payment",
        Account: xrpAddress,
        Destination: vaultAddress,
        Amount: String(amount),
        DestinationTag: destinationTag,
        Memos: [
          {
            Memo: {
              MemoType: "0x6576", // "ev" for Ethereum/EVM in hex
              MemoData: memoData,
              MemoFormat: "text/plain",
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
  };
}
