"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import { useGemWalletStore } from "@/stores/gemWalletClient";
import { useAllWalletsStore } from "@/stores/allWalletsStore";
import { useUTXOGateway } from "@/hooks/useUTXOGateway";
import { useBootstrapStatus } from "@/hooks/useBootstrapStatus";
import { validTokens, getNetworkByChainId } from "@/types/tokens";
import { XRP_CHAIN_ID } from "@/config/xrp";
import { xrpl } from "@/types/networks";

// Helper function to check if binding is required for a network
const requiresBinding = (customChainId: number) => {
  const network = getNetworkByChainId(customChainId);
  if (!network) return false;

  // Check if this network requires extra connection to Imua (binding)
  return network.connector.requireExtraConnectToImua;
};

// Generic function to get binding state (pure function - no side effects)
const getBindingState = async (
  customChainId: number,
  address: string,
  isBootstrapPhase: boolean,
  utxoGatewayContract: any,
): Promise<`0x${string}` | null> => {
  if (!address) return null;

  try {
    if (isBootstrapPhase) {
      // During bootstrap phase, we can't query UTXOGateway contract
      // TODO: Replace with indexer service call when available
      // For now, return null (no bound address exists yet - user hasn't made first deposit)
      console.log(
        `Bootstrap phase: No bound address exists yet for chain ${customChainId} - any EVM wallet can be used for first deposit`,
      );
      return null;
    }

    // Post-bootstrap phase: query UTXOGateway contract
    if (!utxoGatewayContract) {
      throw new Error("UTXOGateway contract not available");
    }

    // Convert address to bytes format based on chain type
    let addressBytes: string;
    if (customChainId === XRP_CHAIN_ID) {
      // XRP address - convert to bytes
      addressBytes = "0x" + Buffer.from(address, "utf8").toString("hex");
    } else {
      // Bitcoin address - convert to bytes (same as XRP for now)
      addressBytes = "0x" + Buffer.from(address, "utf8").toString("hex");
    }

    // Call the contract to get bound address
    const boundAddress = await utxoGatewayContract.read.getImuachainAddress([
      customChainId,
      addressBytes,
    ]);

    // Check if the returned address is not the zero address
    const isValidAddress =
      boundAddress &&
      boundAddress !== "0x0000000000000000000000000000000000000000";

    return isValidAddress ? (boundAddress as `0x${string}`) : null;
  } catch (error) {
    console.error("Error fetching bound address:", error);
    throw error; // Re-throw to let caller handle the error
  }
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
  isBootstrapPhase: boolean,
  utxoGateway: any,
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
      // Set checking state
      setBinding(customChainId, {
        isCheckingBinding: true,
        bindingError: null,
      });

      // Query binding state
      getBindingState(customChainId, address, isBootstrapPhase, utxoGateway)
        .then((boundAddress) => {
          if (boundAddress) {
            // Update with valid binding
            setBinding(customChainId, {
              boundImuaAddress: boundAddress,
              isCheckingBinding: false,
              bindingError: null,
            });
          } else {
            // Clear binding state
            clearBinding(customChainId);
          }
        })
        .catch((error) => {
          // Handle error state
          setBinding(customChainId, {
            isCheckingBinding: false,
            bindingError:
              error instanceof Error ? error.message : "Unknown error",
          });
        });
    }
  } else {
    disconnectWallet(customChainId);
  }
};

export function useSyncAllWalletsToStore() {
  const { bootstrapStatus } = useBootstrapStatus();
  const isBootstrapPhase = !bootstrapStatus?.isBootstrapped;

  // Get unified store operations
  const setBasicWallet = useAllWalletsStore((s) => s.setBasicWallet);
  const setBinding = useAllWalletsStore((s) => s.setBinding);
  const disconnectWallet = useAllWalletsStore((s) => s.disconnectWallet);
  const clearBinding = useAllWalletsStore((s) => s.clearBinding);

  // Single UTXOGateway instance for all networks (XRP, Bitcoin, etc.)
  const { readonlyContract: utxoGateway } = useUTXOGateway(xrpl);

  // Wallet connection hooks
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const xrpConnected = useGemWalletStore((s) => s.isWalletConnected);
  const xrpAddress = useGemWalletStore((s) => s.userAddress);
  const { address: bitcoinAddress, isConnected: bitcoinConnected } =
    useAppKitAccount({ namespace: "bip122" });

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
        isBootstrapPhase,
        utxoGateway,
      );
    });
  }, [
    evmAddress,
    evmConnected,
    setBasicWallet,
    setBinding,
    clearBinding,
    disconnectWallet,
    isBootstrapPhase,
    utxoGateway,
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
        isBootstrapPhase,
        utxoGateway,
      );
    });
  }, [
    xrpAddress,
    xrpConnected,
    setBasicWallet,
    setBinding,
    clearBinding,
    disconnectWallet,
    isBootstrapPhase,
    utxoGateway,
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
        isBootstrapPhase,
        utxoGateway,
      );
    });
  }, [
    bitcoinAddress,
    bitcoinConnected,
    setBasicWallet,
    setBinding,
    clearBinding,
    disconnectWallet,
    isBootstrapPhase,
    utxoGateway,
  ]);
}
