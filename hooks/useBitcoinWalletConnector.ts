"use client";

import { useMemo, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useAccount,
  useBalance,
  useDisconnect as useWagmiDisconnect,
  useSwitchChain,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  useAppKit,
  useAppKitEvents,
  useDisconnect,
  useAppKitBalance,
  useAppKitNetwork,
} from "@reown/appkit/react";
import { bitcoinTestnet } from "@reown/appkit/networks";
import { useAllWalletsStore } from "@/stores/allWalletsStore";
import { btc } from "@/types/tokens";
import { bootstrapContractNetwork, imuaChain } from "@/types/networks";
import { BitcoinWalletConnector } from "@/types/wallet-connector";
import { useBootstrapStatus } from "@/hooks/useBootstrapStatus";

export function useBitcoinWalletConnector(): BitcoinWalletConnector {
  // Expected Bitcoin network (using testnet for testing)
  const expectedBitcoinNetwork = bitcoinTestnet;

  // AppKit hooks for Bitcoin wallet
  const { bootstrapStatus } = useBootstrapStatus();
  const { open: openAppKit } = useAppKit();
  const { disconnect: disconnectAppKit } = useDisconnect();
  const { fetchBalance } = useAppKitBalance();
  const { switchNetwork, caipNetworkId } = useAppKitNetwork();

  // EVM wallet state for Imua connection (same wallet as Bitcoin)
  const {
    address: evmAddress,
    isConnected: isWagmiConnected,
    chainId: evmChainId,
  } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect: disconnectEVM } = useWagmiDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: evmBalance } = useBalance({ address: evmAddress });

  // Get Bitcoin wallet state from unified store
  const boundImuaAddress = useAllWalletsStore(
    (state) => state.wallets[btc.network.customChainIdByImua]?.boundImuaAddress,
  );
  const isBitcoinConnected = useAllWalletsStore(
    (state) => state.wallets[btc.network.customChainIdByImua]?.isConnected,
  );
  const bitcoinAddress = useAllWalletsStore(
    (state) => state.wallets[btc.network.customChainIdByImua]?.address,
  );

  const events = useAppKitEvents();
  const isBootstrapPhase = !bootstrapStatus?.isBootstrapped;
  const targetEVMChainId = isBootstrapPhase
    ? bootstrapContractNetwork.evmChainID
    : imuaChain.evmChainID;

  // Bitcoin balance query using AppKit
  const balance = useQuery({
    queryKey: ["Bitcoin Balance", bitcoinAddress],
    queryFn: async (): Promise<any> => {
      if (!bitcoinAddress || !isBitcoinConnected)
        throw new Error("Bitcoin address not available or not connected");

      try {
        const balanceData = await fetchBalance();
        // AppKit GetBalanceResult structure: { balance: string, symbol: string }
        // Convert BTC to satoshis (1 BTC = 100,000,000 satoshis)
        const btcBalance = parseFloat(balanceData.data?.balance || "0");
        const satoshis = Math.floor(btcBalance * 1e8); // Convert to satoshis

        return {
          value: BigInt(satoshis),
          decimals: 8, // Bitcoin always has 8 decimals
          symbol: balanceData.data?.symbol || "BTC",
        };
      } catch (error) {
        console.error("Failed to fetch Bitcoin balance:", error);
        // Return zero balance on error
        return {
          value: BigInt(0),
          decimals: 8,
          symbol: "BTC",
        };
      }
    },
    enabled: !!bitcoinAddress && !!isBitcoinConnected,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // Don't retry on error to avoid spam
  });

  // Detect if wallet is on wrong network by checking address prefix
  // Bitcoin addresses have different prefixes for mainnet vs testnet
  const isWrongNetwork = useMemo(() => {
    if (!isBitcoinConnected || !bitcoinAddress) return false;

    // Bitcoin mainnet addresses start with '1', '3', or 'bc1'
    // Bitcoin testnet addresses start with 'm', 'n', '2', or 'tb1'
    const isMainnetAddress =
      bitcoinAddress.startsWith("1") ||
      bitcoinAddress.startsWith("3") ||
      bitcoinAddress.startsWith("bc1");
    const isTestnetAddress =
      bitcoinAddress.startsWith("m") ||
      bitcoinAddress.startsWith("n") ||
      bitcoinAddress.startsWith("2") ||
      bitcoinAddress.startsWith("tb1");

    // We expect testnet, so mainnet address = wrong network
    return isMainnetAddress;
  }, [isBitcoinConnected, bitcoinAddress]);

  // State for connection promise resolution
  const [connectionPromise, setConnectionPromise] = useState<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);

  // Listen for AppKit events
  useEffect(() => {
    if (events.data && connectionPromise) {
      if (
        events.data.event === "MODAL_CLOSE" ||
        events.data.event === "CONNECT_SUCCESS" ||
        events.data.event === "CONNECT_ERROR"
      ) {
        // Modal closed, connection successful, or connection failed - always resolve the promise so the wallet connection modal reopens
        // The connection status will be checked by the modal itself
        connectionPromise.resolve();
        setConnectionPromise(null);
      }
    }
  }, [events.data, connectionPromise]);

  // Connect to Bitcoin wallet
  const connectNative = async () => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Store the promise resolvers
        setConnectionPromise({ resolve, reject });

        // Open AppKit modal for Bitcoin wallet connection
        openAppKit({ view: "Connect", namespace: "bip122" });

        // Set up a timeout as fallback
        setTimeout(() => {
          if (connectionPromise) {
            connectionPromise.reject(new Error("Connection timeout"));
            setConnectionPromise(null);
          }
        }, 30000); // 30 second timeout
      } catch (error) {
        console.error("Failed to connect Bitcoin wallet:", error);
        reject(error);
      }
    });
  };

  // Disconnect Bitcoin wallet
  const disconnectNative = async () => {
    try {
      disconnectAppKit();
    } catch (error) {
      console.error("Failed to disconnect Bitcoin wallet:", error);
      throw error;
    }
  };

  const isReadyForStaking = useMemo(() => {
    const ready = !!(
      isBitcoinConnected &&
      isWagmiConnected &&
      !isWrongNetwork &&
      evmChainId === targetEVMChainId &&
      (!boundImuaAddress || boundImuaAddress === evmAddress)
    );

    return ready;
  }, [
    isBitcoinConnected,
    isWagmiConnected,
    isWrongNetwork,
    evmChainId,
    targetEVMChainId,
    boundImuaAddress,
    evmAddress,
    isBootstrapPhase,
  ]);

  const nativeWallet = useMemo(
    () => ({
      connected: isBitcoinConnected || false,
      address: bitcoinAddress,
      balance: {
        value: balance.data?.value || BigInt(0),
        decimals: balance.data?.decimals || 8,
        symbol: balance.data?.symbol || "BTC",
      },
    }),
    [isBitcoinConnected, bitcoinAddress, balance.data],
  );

  const bindingEVMWallet = useMemo(
    () => ({
      connected: isWagmiConnected,
      address: evmAddress,
      balance: {
        value: evmBalance?.value || BigInt(0),
        decimals: evmBalance?.decimals || 18,
        symbol: evmBalance?.symbol || "",
      },
    }),
    [isWagmiConnected, evmAddress, evmBalance],
  );

  const bindingState = useMemo(
    () => ({
      isBound: !!boundImuaAddress,
      expectedBoundAddress: boundImuaAddress || undefined,
    }),
    [boundImuaAddress],
  );

  const issues = useMemo(() => {
    if (isReadyForStaking) return undefined;
    console.log("isWrongNetwork", isWrongNetwork);

    // Check if Bitcoin is connected but on wrong network
    // We detect this by checking if the balance fetch is failing due to network mismatch
    const needsSwitchNative =
      isBitcoinConnected &&
      (caipNetworkId !== expectedBitcoinNetwork.caipNetworkId ||
        isWrongNetwork);

    return {
      needsConnectNative: !isBitcoinConnected
        ? {
            resolve: connectNative,
            needsAction: true,
          }
        : undefined,
      needsSwitchNative: needsSwitchNative
        ? {
            resolve: async () => {
              // Disconnect current wallet and prompt user to switch network manually
              await disconnectNative();
              // User will need to reconnect after switching network in their wallet
            },
            needsAction: true,
          }
        : undefined,
      needsConnectBindingEVM: !isWagmiConnected
        ? {
            resolve: async () => {
              if (openConnectModal) {
                openConnectModal();
              }
            },
            needsAction: true,
          }
        : undefined,
      needsSwitchBindingEVM:
        isWagmiConnected && evmChainId !== targetEVMChainId
          ? {
              resolve: async () => {
                if (switchChain) {
                  switchChain({ chainId: targetEVMChainId });
                }
              },
              needsAction: true,
            }
          : undefined,
      needsMatchingAddress: !!(
        boundImuaAddress && boundImuaAddress !== evmAddress
      )
        ? {
            // address matching is handled by connecting the correct wallet
            needsAction: true,
          }
        : undefined,
      others: undefined,
    };
  }, [
    isReadyForStaking,
    isBitcoinConnected,
    isWagmiConnected,
    evmChainId,
    boundImuaAddress,
    evmAddress,
    connectNative,
    caipNetworkId,
    expectedBitcoinNetwork,
    switchNetwork,
    isWrongNetwork,
  ]);

  return {
    isReadyForStaking,
    nativeWallet,
    bindingEVMWallet,
    bindingState,
    issues,
    disconnectNative: disconnectNative,
    disconnectBindingEVM: async () => {
      if (disconnectEVM) {
        disconnectEVM();
      }
    },
  };
}
