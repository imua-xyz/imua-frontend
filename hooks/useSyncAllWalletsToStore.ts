"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useGemWalletStore } from "@/stores/gemWalletClient";
import { useAllWalletsStore } from "@/stores/allWalletsStore";
import { useBindingStore } from "@/stores/bindingClient";
import { validTokens, xrp } from "@/types/tokens";

// Add more wallet hooks/stores as needed

export function useSyncAllWalletsToStore() {
  // EVM (wagmi)
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const setWallet = useAllWalletsStore((s) => s.setWallet);
  const disconnectWallet = useAllWalletsStore((s) => s.disconnectWallet);

  useEffect(() => {
    if (evmConnected && evmAddress) {
      validTokens.map((token) => {
        if (token.connector.evmCompatible) {
          setWallet(token.network.customChainIdByImua, {
            isConnected: true,
            address: evmAddress,
            boundImuaAddress: undefined,
          });
        }
      });
    } else {
      validTokens.map((token) => {
        if (token.connector.evmCompatible) {
          disconnectWallet(token.network.customChainIdByImua);
        }
      });
    }
  }, [evmConnected, evmAddress, setWallet, disconnectWallet]);

  // XRP (GemWallet)
  const xrpConnected = useGemWalletStore((s) => s.isWalletConnected);
  const xrpAddress = useGemWalletStore((s) => s.userAddress);
  const boundImuaAddress = useBindingStore(
    (s) => s.boundAddresses[xrpAddress ?? ""],
  );

  useEffect(() => {
    if (xrpConnected && xrpAddress) {
      setWallet(xrp.network.customChainIdByImua, {
        isConnected: true,
        address: xrpAddress,
        boundImuaAddress: boundImuaAddress ?? undefined,
      });
    } else {
      disconnectWallet(xrp.network.customChainIdByImua);
    }
  }, [xrpConnected, xrpAddress, setWallet, disconnectWallet, boundImuaAddress]);

  // Add more wallet sync effects here for future wallets (e.g., solana, cosmos, etc)
}
