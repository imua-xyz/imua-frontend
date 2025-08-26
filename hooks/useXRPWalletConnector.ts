"use client";

import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useGemWalletStore } from "@/stores/gemWalletClient";
import { useBindingStore } from "@/stores/bindingClient";
import { imuaChain } from "@/types/networks";
import { useXrplStore } from "@/stores/xrplClient";
import { XRPWalletConnector } from "@/types/wallet-connector";

export function useXRPWalletConnector(): XRPWalletConnector {
  const isGemWalletConnected = useGemWalletStore(
    (state) => state.isWalletConnected,
  );
  const xrpAddress = useGemWalletStore((state) => state.userAddress);
  const walletNetwork = useGemWalletStore((state) => state.walletNetwork);
  const checkInstallation = useGemWalletStore(
    (state) => state.checkInstallation,
  );
  const connect = useGemWalletStore((state) => state.connect);
  const disconnect = useGemWalletStore((state) => state.disconnect);

  const boundImuaAddress = useBindingStore(
    (state) => state.boundAddresses[xrpAddress ?? ""],
  );

  const xrplClient = useXrplStore((state) => state.client);
  const setNetwork = useXrplStore((state) => state.setNetwork);
  const getAccountInfo = useXrplStore((state) => state.getAccountInfo);

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
  const issues = useMemo(() => {
    return {
      needsConnectToNative: !isGemWalletConnected,
      needsConnectToImua:
        !isWagmiConnected || evmChainId !== imuaChain.evmChainID,
      needsMatchingBoundAddress: boundImuaAddress
        ? boundImuaAddress !== evmAddress
        : !!evmAddress,
      others:
        walletNetwork && walletNetwork.network !== "Testnet"
          ? ["Please connect to the XRP Testnet to use this service."]
          : undefined,
    };
  }, [
    isGemWalletConnected,
    isWagmiConnected,
    evmChainId,
    boundImuaAddress,
    evmAddress,
    walletNetwork,
  ]);

  const isReady = useMemo(() => {
    return (
      !issues.needsConnectToNative &&
      !issues.needsConnectToImua &&
      !issues.needsMatchingBoundAddress
    );
  }, [issues]);

  const balance = useQuery({
    queryKey: ["XRP Balance", xrpAddress],
    queryFn: async (): Promise<any> => {
      if (!xrpAddress) throw new Error("Required dependencies not available");
      const accountInfo = await getAccountInfo(xrpAddress);
      if (!accountInfo.success) throw new Error("Failed to fetch account info");
      return {
        value: accountInfo.data?.balance || BigInt(0),
        decimals: 6,
        symbol: "XRP",
      };
    },
    enabled: !!xrpAddress && !!getAccountInfo,
  });

  const nativeCurrencyBalance = {
    value: balance.data?.value || BigInt(0),
    decimals: balance.data?.decimals || 0,
    symbol: balance.data?.symbol || "",
  };

  return {
    isReady: isReady,
    isNativeWalletConnected: isGemWalletConnected,
    isImuaConnected: isWagmiConnected && evmChainId === imuaChain.evmChainID,
    nativeWalletAddress: xrpAddress as `0x${string}`,
    nativeCurrencyBalance: nativeCurrencyBalance,
    boundAddress: boundImuaAddress || "",
    issues: issues,
    checkNativeInstallation: checkInstallation,
    connectNative: connect,
    disconnectNative: disconnect,
  };
}
