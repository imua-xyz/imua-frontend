"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import { useGemWalletStore } from "@/stores/gemWalletClient";
import { useAllWalletsStore } from "@/stores/allWalletsStore";
import { useAddressBinding } from "@/hooks/useAddressBinding";
import { validTokens, getNetworkByChainId } from "@/types/tokens";
import { xrpl, bitcoinTestnet } from "@/types/networks";

// Helper function to check if binding is required for a network
const requiresBinding = (customChainId: number) => {
  const network = getNetworkByChainId(customChainId);
  if (!network) return false;

  // Check if this network requires extra connection to Imua (binding)
  return network.connector.requireExtraConnectToImua;
};

// Generic wallet update function
const updateWalletState = async (
  customChainId: number,
  address: string | undefined,
  isConnected: boolean,
  setBasicWallet: any,
  setBinding: any,
  clearBinding: any,
  disconnectWallet: any,
  bindingData?: any,
) => {
  if (isConnected && address) {
    // Always reset wallet state for clean, predictable behavior
    disconnectWallet(customChainId);

    // Update basic wallet state
    setBasicWallet(customChainId, {
      isConnected: true,
      address: address,
    });

    // Trigger binding check if required
    if (requiresBinding(customChainId)) {
      // Use binding data directly from unified hook
      const boundAddress = bindingData?.data;
      const bindingError = bindingData?.error;
      const isLoading = bindingData?.loading;

      if (isLoading) {
        // Set checking state while loading
        setBinding(customChainId, {
          isCheckingBinding: true,
          bindingError: null,
        });
      } else if (bindingError) {
        // Handle error state - don't clear existing bindings on error
        setBinding(customChainId, {
          isCheckingBinding: false,
          bindingError:
            bindingError instanceof Error
              ? bindingError.message
              : "Unknown error",
        });
      } else if (boundAddress) {
        // Update with valid binding
        console.log(
          `Found bound address ${boundAddress} for ${address} on chain ${customChainId} (source: ${bindingData.source})`,
        );
        setBinding(customChainId, {
          boundImuaAddress: boundAddress as `0x${string}`,
          isCheckingBinding: false,
          bindingError: null,
        });
      } else {
        // No binding found
        console.log(
          `No bound address found for ${address} on chain ${customChainId} - user needs to make first deposit`,
        );

        // Only clear binding if we're still in checking state
        // Don't overwrite manually set bindings from successful transactions
        const currentWallet =
          useAllWalletsStore.getState().wallets[customChainId];
        const hasManualBinding =
          currentWallet?.boundImuaAddress && !currentWallet?.isCheckingBinding;

        if (!hasManualBinding) {
          // Clear binding state only if no manual binding exists
          clearBinding(customChainId);
        } else {
          // Keep manual binding, just clear checking state
          setBinding(customChainId, {
            isCheckingBinding: false,
            bindingError: null,
          });
        }
      }
    }
  } else {
    disconnectWallet(customChainId);
  }
};

export function useSyncAllWalletsToStore() {
  // Get unified store operations
  const setBasicWallet = useAllWalletsStore((s) => s.setBasicWallet);
  const setBinding = useAllWalletsStore((s) => s.setBinding);
  const disconnectWallet = useAllWalletsStore((s) => s.disconnectWallet);
  const clearBinding = useAllWalletsStore((s) => s.clearBinding);

  // Wallet connection hooks
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const xrpConnected = useGemWalletStore((s) => s.isWalletConnected);
  const xrpAddress = useGemWalletStore((s) => s.userAddress);
  const { address: bitcoinAddress, isConnected: bitcoinConnected } =
    useAppKitAccount({ namespace: "bip122" });

  // Unified binding hooks (auto-switches between GraphQL and contract)
  const xrpBinding = useAddressBinding(
    "XRP",
    xrpAddress || "",
    xrpl.customChainIdByImua,
  );
  const bitcoinBinding = useAddressBinding(
    "BTC",
    bitcoinAddress || "",
    bitcoinTestnet.customChainIdByImua,
  );

  // Get unique networks from valid tokens
  const uniqueNetworks = Array.from(
    new Map(
      validTokens.map((token) => [
        token.network.customChainIdByImua,
        token.network,
      ]),
    ).values(),
  );

  // Group networks by wallet type for efficient updates
  const evmNetworks = uniqueNetworks.filter(
    (network) => network.connector.evmCompatible,
  );
  const xrpNetworks = uniqueNetworks.filter(
    (network) => network.chainName === "XRPL",
  );
  const bitcoinNetworks = uniqueNetworks.filter(
    (network) =>
      network.chainName === "Bitcoin" ||
      network.chainName === "Bitcoin Testnet",
  );

  // EVM networks sync - only triggers on EVM wallet changes
  useEffect(() => {
    evmNetworks.forEach(async (network) => {
      await updateWalletState(
        network.customChainIdByImua,
        evmAddress,
        evmConnected,
        setBasicWallet,
        setBinding,
        clearBinding,
        disconnectWallet,
      );
    });
  }, [
    evmAddress,
    evmConnected,
    setBasicWallet,
    setBinding,
    clearBinding,
    disconnectWallet,
  ]);

  // XRP network sync - only triggers on XRP wallet changes
  useEffect(() => {
    xrpNetworks.forEach(async (network) => {
      await updateWalletState(
        network.customChainIdByImua,
        xrpAddress,
        xrpConnected,
        setBasicWallet,
        setBinding,
        clearBinding,
        disconnectWallet,
        xrpBinding,
      );
    });
  }, [
    xrpAddress,
    xrpConnected,
    setBasicWallet,
    setBinding,
    clearBinding,
    disconnectWallet,
    xrpBinding,
  ]);

  // Bitcoin networks sync - only triggers on Bitcoin wallet changes
  useEffect(() => {
    bitcoinNetworks.forEach(async (network) => {
      await updateWalletState(
        network.customChainIdByImua,
        bitcoinAddress,
        bitcoinConnected,
        setBasicWallet,
        setBinding,
        clearBinding,
        disconnectWallet,
        bitcoinBinding,
      );
    });
  }, [
    bitcoinAddress,
    bitcoinConnected,
    setBasicWallet,
    setBinding,
    clearBinding,
    disconnectWallet,
    bitcoinBinding,
  ]);
}
