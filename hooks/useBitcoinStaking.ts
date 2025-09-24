"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react";
import type { BitcoinConnector } from "@reown/appkit-adapter-bitcoin";
import * as bitcoin from "bitcoinjs-lib";
import { BaseTxOptions, StakerBalance, TokenBalance } from "@/types/staking";
import { StakingService } from "@/types/staking-service";
import { tbtc } from "@/types/tokens";
import { useAllWalletsStore } from "@/stores/allWalletsStore";
import { ESPLORA_API_URL } from "@/config/bitcoin";
import { usePortalContract } from "./usePortalContract";
import {
  handleEVMTxWithStatus,
  handleBitcoinTxWithStatus,
} from "@/lib/txUtils";
import { useStakerBalances } from "./useStakerBalances";
import { useBootstrapStatus } from "./useBootstrapStatus";
import { useBitcoinPSBTBuilder } from "./useBitcoinPSBTBuilder";
import {
  BTC_VAULT_ADDRESS,
  MINIMUM_STAKE_AMOUNT_SATS,
  BTC_TOKEN_ENUM,
} from "@/config/bitcoin";
import { useTokenBalance } from "./useTokenBalance";
import axios from "axios";

export function useBitcoinStaking(): StakingService {
  const vaultAddress = BTC_VAULT_ADDRESS;
  const { address: evmAddress, isConnected: isWagmiConnected } = useAccount();

  // AppKit hooks for Bitcoin wallet interaction
  const { walletProvider } = useAppKitProvider<BitcoinConnector>("bip122");
  const { address: bitcoinAddress, isConnected: isBitcoinConnected } =
    useAppKitAccount({ namespace: "bip122" });

  const boundImuaAddress = useAllWalletsStore(
    (state) =>
      state.wallets[tbtc.network.customChainIdByImua]?.boundImuaAddress,
  );
  const setBoundAddress = useAllWalletsStore((state) => state.setBinding);

  // Get account addresses for UTXO management
  const [accountAddresses, setAccountAddresses] = useState<any[]>([]);
  const paymentAddress = accountAddresses.find(
    (addr) => addr.purpose === "payment",
  );

  // PSBT builder for Bitcoin transactions
  const psbtBuilder = useBitcoinPSBTBuilder(paymentAddress?.address);

  // Fetch account addresses when wallet provider is available
  useEffect(() => {
    if (walletProvider) {
      walletProvider
        .getAccountAddresses()
        .then(setAccountAddresses)
        .catch(console.error);
    }
  }, [walletProvider]);

  const { bootstrapStatus } = useBootstrapStatus();
  const { readonlyContract, writeableContract, publicClient } =
    usePortalContract(tbtc.network);

  // Get staker balance for Bitcoin
  const [stakerBalanceResponse] = useStakerBalances([tbtc]);

  // Fetch Bitcoin token balance using the unified hook
  const tokenBalanceQuery = useTokenBalance({
    token: tbtc,
    address: bitcoinAddress,
    refetchInterval: 30000, // 30 seconds
  });

  const stakerBalance = useMemo<StakerBalance>(() => {
    const s = stakerBalanceResponse.data;
    return {
      clientChainID: tbtc.network.customChainIdByImua,
      stakerAddress: bitcoinAddress || "",
      tokenID: tbtc.address,
      totalBalance: s?.balance || BigInt(0),
      withdrawable: s?.withdrawable || BigInt(0),
      delegated: s?.delegated || BigInt(0),
      pendingUndelegated: s?.pendingUndelegated || BigInt(0),
      totalDeposited: s?.totalDeposited || BigInt(0),
    };
  }, [stakerBalanceResponse.data, bitcoinAddress]);

  const tokenBalance = useMemo<TokenBalance>(() => {
    return {
      token: {
        customClientChainID: tbtc.network.customChainIdByImua,
        tokenID: tbtc.address,
      },
      stakerAddress: bitcoinAddress || "",
      balance: {
        value: tokenBalanceQuery.data?.value || BigInt(0),
        decimals: tokenBalanceQuery.data?.decimals || tbtc.decimals,
        symbol: tokenBalanceQuery.data?.symbol || tbtc.symbol,
      },
    };
  }, [tokenBalanceQuery.data, bitcoinAddress]);

  // Stake Bitcoin (similar to XRP staking)
  const stakeBitcoin = useCallback(
    async (
      amount: bigint,
      operatorAddress?: string,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      const bootstrapped = bootstrapStatus?.isBootstrapped;
      if (bootstrapped === undefined)
        throw new Error("Bootstrap status not available");
      if (!isBitcoinConnected || !isWagmiConnected || !bitcoinAddress)
        throw new Error("Bitcoin wallet not connected");
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

      if (!walletProvider) {
        throw new Error("Bitcoin wallet provider not available");
      }

      // Determine which address to use for op_return data
      let opReturnAddress = "";
      let effectiveAddress: `0x${string}` | null = null;

      if (boundImuaAddress) {
        // Use the already bound address (priority)
        opReturnAddress = boundImuaAddress;
        effectiveAddress = boundImuaAddress as `0x${string}`;
      } else if (evmAddress) {
        // Fallback to connected EVM wallet address
        opReturnAddress = evmAddress;
        effectiveAddress = evmAddress as `0x${string}`;
      }

      if (!opReturnAddress) throw new Error("Op return address not found");

      // Encode memo data similar to XRP staking
      let opReturnData: string;
      if (!bootstrapped) {
        if (!operatorAddress)
          throw new Error("Operator address is required for bootstrap phase");

        // Remove 0x prefix from EVM address and convert to bytes
        const cleanOpReturnAddress = opReturnAddress.startsWith("0x")
          ? opReturnAddress.slice(2)
          : opReturnAddress;
        const evmAddressBytes = Buffer.from(cleanOpReturnAddress, "hex");
        const operatorBytes = Buffer.from(operatorAddress, "utf8");

        opReturnData = Buffer.concat([evmAddressBytes, operatorBytes]).toString(
          "hex",
        );

        // Truncate if too long (Bitcoin OP_RETURN limit is 80 bytes)
        if (Buffer.from(opReturnData, "hex").length > 80) {
          throw new Error(
            `OP_RETURN data too long (${opReturnData.length} bytes), exceeds 80 bytes`,
          );
        }
      } else {
        // Remove 0x prefix from EVM address and convert to bytes
        const cleanOpReturnAddress = opReturnAddress.startsWith("0x")
          ? opReturnAddress.slice(2)
          : opReturnAddress;
        opReturnData = Buffer.from(cleanOpReturnAddress, "hex").toString("hex");

        // Truncate if too long (Bitcoin OP_RETURN limit is 80 bytes)
        if (Buffer.from(opReturnData, "hex").length > 80) {
          throw new Error(
            `OP_RETURN data too long (${opReturnData.length} bytes), exceeds 80 bytes`,
          );
        }
      }

      if (!opReturnData) {
        throw new Error("OP_RETURN data not successfully built");
      }

      const spawnTx = async () => {
        try {
          if (!paymentAddress) {
            throw new Error("No payment address found in wallet");
          }

          if (!psbtBuilder.canBuild) {
            throw new Error("PSBT builder not ready");
          }

          // Build PSBT using the dedicated hook
          const { psbt } = await psbtBuilder.buildPSBT({
            vaultAddress,
            amount,
            opReturnData: opReturnData,
          });

          // Sign the PSBT using the wallet provider and broadcast
          const result = await walletProvider.signPSBT({
            psbt: psbt,
            signInputs: [], // Let the wallet sign all inputs
            broadcast: true,
          });

          if (!result.txid) {
            throw new Error("Transaction ID not found");
          }
          const txid = result.txid;
          console.log("Bitcoin stake transaction broadcasted:", txid);

          return txid;
        } catch (error) {
          console.error("Bitcoin PSBT transaction failed:", error);
          throw error;
        }
      };

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
          console.log("Bitcoin stake succeeded, updating cached balances...");
          stakerBalanceResponse.refetch();
          // UTXOs will be refetched automatically by the PSBT builder hook
        }
      };

      const { hash, success, error } = await handleBitcoinTxWithStatus({
        spawnTx: spawnTx,
        mode: bootstrapped ? "simplex" : "local",
        verifyCompletion: verifyCompletion,
        getStateSnapshot: getStateSnapshot,
        onPhaseChange: options?.onPhaseChange
          ? (phase: string) => options.onPhaseChange?.(phase as any)
          : undefined,
        onSuccess: onSuccess,
        utxoGateway: readonlyContract as any,
      });

      // If transaction and following checks were successful and we don't have a bound address yet, we should explicitly set the bound address
      if (success && !boundImuaAddress && effectiveAddress) {
        // Given even the completion verification has been successful, we should explicitly set the bound address
        setBoundAddress(tbtc.network.customChainIdByImua, {
          boundImuaAddress: effectiveAddress as string,
          isCheckingBinding: false,
          bindingError: null,
        });
      }

      return { hash, success, error };
    },
    [
      bootstrapStatus,
      isBitcoinConnected,
      isWagmiConnected,
      bitcoinAddress,
      evmAddress,
      boundImuaAddress,
      walletProvider,
      setBoundAddress,
      stakerBalanceResponse,
      readonlyContract,
      paymentAddress,
      psbtBuilder,
    ],
  );

  // Delegate Bitcoin to an operator
  const delegateBitcoin = useCallback(
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
        writeableContract.write.delegateTo([BTC_TOKEN_ENUM, operator, amount]);
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
          console.log(
            "Bitcoin delegate succeeded, updating cached balances...",
          );
          stakerBalanceResponse.refetch();
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
    [
      writeableContract,
      boundImuaAddress,
      evmAddress,
      bootstrapStatus,
      stakerBalanceResponse,
      publicClient,
    ],
  );

  // Undelegate Bitcoin from an operator
  const undelegateBitcoin = useCallback(
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
          BTC_TOKEN_ENUM,
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
        balanceAfter: bigint,
      ) => {
        return instantUnbond
          ? balanceAfter > balanceBefore
          : balanceAfter === balanceBefore + amount;
      };

      const onSuccess = (result: { hash: string; success: boolean }) => {
        if (result.success) {
          console.log(
            "Bitcoin undelegate succeeded, updating cached balances...",
          );
          stakerBalanceResponse.refetch();
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
    [
      writeableContract,
      boundImuaAddress,
      evmAddress,
      bootstrapStatus,
      stakerBalanceResponse,
      publicClient,
    ],
  );

  // Withdraw Bitcoin from staking
  const withdrawBitcoin = useCallback(
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
        writeableContract.write.withdrawPrincipal([BTC_TOKEN_ENUM, amount]);
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
          console.log(
            "Bitcoin withdraw succeeded, updating cached balances...",
          );
          stakerBalanceResponse.refetch();
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
    [
      writeableContract,
      boundImuaAddress,
      evmAddress,
      bootstrapStatus,
      stakerBalanceResponse,
      publicClient,
    ],
  );

  // Get relaying fee (Bitcoin doesn't have relaying fees like EVM)
  const getQuote = useCallback(async (): Promise<bigint> => {
    return BigInt(0);
  }, []);

  return {
    token: tbtc,
    tokenBalance: tokenBalance,
    stake: stakeBitcoin,
    delegateTo: delegateBitcoin,
    undelegateFrom: undelegateBitcoin,
    withdrawPrincipal: withdrawBitcoin,
    getQuote,
    stakerBalance: stakerBalance,
    vaultAddress: vaultAddress,
    minimumStakeAmount: BigInt(MINIMUM_STAKE_AMOUNT_SATS),
    isDepositThenDelegateDisabled: bootstrapStatus?.isBootstrapped,
    isOnlyDepositThenDelegateAllowed: !bootstrapStatus?.isBootstrapped,
  };
}
