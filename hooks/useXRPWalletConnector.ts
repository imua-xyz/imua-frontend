"use client";

import { useMemo, useEffect } from "react";
import { useAccount, useBalance, useDisconnect, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  useGemWalletStore,
  initializeGemWallet,
} from "@/stores/gemWalletClient";
import { useAllWalletsStore } from "@/stores/allWalletsStore";
import { imuaChain, bootstrapContractNetwork } from "@/types/networks";
import { xrp } from "@/types/tokens";
import { useXrplStore } from "@/stores/xrplClient";
import { XRPWalletConnector } from "@/types/wallet-connector";
import { useBootstrapStatus } from "@/hooks/useBootstrapStatus";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useReverseAddressBinding } from "@/hooks/useAddressBinding";

export function useXRPWalletConnector(): XRPWalletConnector {
  const { bootstrapStatus } = useBootstrapStatus();
  // Get XRP wallet state from unified store
  const isGemWalletConnected = useAllWalletsStore(
    (state) =>
      state.wallets[xrp.network.customChainIdByImua]?.isConnected || false,
  );
  const xrpAddress = useAllWalletsStore(
    (state) => state.wallets[xrp.network.customChainIdByImua]?.address,
  );
  const boundImuaAddress = useAllWalletsStore(
    (state) => state.wallets[xrp.network.customChainIdByImua]?.boundImuaAddress,
  );

  // Still need Gem wallet operations and network state
  const walletNetwork = useGemWalletStore((state) => state.walletNetwork);
  const isNativeInstalled = useGemWalletStore((state) => state.installed);
  const checkInstallation = useGemWalletStore(
    (state) => state.checkInstallation,
  );
  const connect = useGemWalletStore((state) => state.connect);
  const disconnect = useGemWalletStore((state) => state.disconnect);

  const setNetwork = useXrplStore((state) => state.setNetwork);

  // Initialize GemWallet on mount (but only start session check, don't auto-reconnect)
  // The gemWalletClient already handles initial auto-reconnect on first load
  useEffect(() => {
    initializeGemWallet();
  }, []);

  useEffect(() => {
    if (walletNetwork) {
      setNetwork(walletNetwork);
    }
  }, [walletNetwork, setNetwork]);

  const {
    address: evmAddress,
    isConnected: isWagmiConnected,
    chainId: evmChainId,
  } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect: disconnectEVM } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: evmBalance } = useBalance({ address: evmAddress });

  // Use the unified token balance hook
  const balanceQuery = useTokenBalance({
    token: xrp,
    address: xrpAddress,
    refetchInterval: 30000, // 30 seconds
  });

  // Check reverse binding to ensure EVM address isn't bound to different XRP addresses
  const reverseBindingQuery = useReverseAddressBinding(evmAddress || "", xrp);

  // Determine if we're in bootstrap phase
  const isBootstrapPhase = !bootstrapStatus?.isBootstrapped;

  // Determine which EVM network we need to connect to
  const targetEVMChainId = isBootstrapPhase
    ? bootstrapContractNetwork.evmChainID
    : imuaChain.evmChainID;

  // Check if EVM address is bound to different XRP addresses
  const hasConflictingBinding = useMemo(() => {
    if (!evmAddress || !isGemWalletConnected || !xrpAddress) return false;

    // If reverse binding address exists, check if it matches the current XRP address
    const boundXrpAddress = reverseBindingQuery.boundSourceAddress;

    // Conflict exists if the EVM address is bound to a different XRP address
    if (
      boundXrpAddress &&
      boundXrpAddress.toLowerCase() !== xrpAddress.toLowerCase()
    ) {
      console.warn(
        `Conflict: EVM address ${evmAddress} is already bound to XRP address ${boundXrpAddress}, ` +
          `but current connected XRP address is ${xrpAddress}`,
      );
      return true;
    }

    return false;
  }, [
    evmAddress,
    isGemWalletConnected,
    xrpAddress,
    reverseBindingQuery.boundSourceAddress,
  ]);

  const isReadyForStaking = useMemo(() => {
    return (
      isGemWalletConnected &&
      isWagmiConnected &&
      evmChainId === targetEVMChainId &&
      (!boundImuaAddress ||
        boundImuaAddress.toLowerCase() === evmAddress?.toLowerCase()) &&
      !!walletNetwork &&
      walletNetwork.network === "Testnet" &&
      !hasConflictingBinding
    );
  }, [
    isGemWalletConnected,
    isWagmiConnected,
    evmChainId,
    targetEVMChainId,
    boundImuaAddress,
    evmAddress,
    walletNetwork,
    hasConflictingBinding,
  ]);

  const nativeWallet = useMemo(
    () => ({
      connected: isGemWalletConnected,
      address: xrpAddress,
      balance: {
        value: balanceQuery.data?.value || BigInt(0),
        decimals: balanceQuery.data?.decimals || 6,
        symbol: balanceQuery.data?.symbol || "XRP",
      },
    }),
    [isGemWalletConnected, xrpAddress, balanceQuery.data],
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

  // Check installation status only when component mounts (once per component)
  useEffect(() => {
    // Only check if we don't already know the installation status
    if (isNativeInstalled === false) {
      checkInstallation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount, not on every re-render

  // Check installation when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
      // Only check if we don't already know the installation status
      if (isNativeInstalled === false) {
        checkInstallation();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount, not on every re-render

  const issues = useMemo(() => {
    if (isReadyForStaking) return undefined;

    return {
      needsInstallNative: !isNativeInstalled
        ? {
            needsAction: true,
            // users need to manually install the Gem Wallet
          }
        : undefined,
      needsConnectNative:
        !isGemWalletConnected && isNativeInstalled
          ? {
              resolve: async () => {
                await connect();
              },
              needsAction: true,
            }
          : undefined,
      needsSwitchNative:
        isGemWalletConnected &&
        walletNetwork &&
        walletNetwork.network !== "Testnet"
          ? {
              resolve: async () => {
                // Disconnect current wallet and prompt user to switch network manually
                await disconnect();
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
        boundImuaAddress &&
        boundImuaAddress.toLowerCase() !== evmAddress?.toLowerCase()
      )
        ? {
            // Address matching is handled by manually connecting the correct wallet
            needsAction: true,
          }
        : undefined,
      needsResolveConflictingBinding: hasConflictingBinding
        ? {
            // EVM address is bound to different XRP address
            needsAction: true,
            boundNativeAddress:
              reverseBindingQuery.boundSourceAddress || undefined,
          }
        : undefined,
      others: undefined,
    };
  }, [
    isReadyForStaking,
    isGemWalletConnected,
    isWagmiConnected,
    evmChainId,
    targetEVMChainId,
    boundImuaAddress,
    evmAddress,
    walletNetwork,
    connect,
    hasConflictingBinding,
  ]);

  return {
    isReadyForStaking,
    nativeWallet,
    bindingEVMWallet,
    bindingState,
    issues,
    disconnectNative: async () => {
      await disconnect();
    },
    disconnectBindingEVM: async () => {
      if (disconnectEVM) {
        disconnectEVM();
      }
    },
  };
}
