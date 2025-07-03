// components/layout/MultiWalletStatus.tsx
"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import { WalletDetailsModal } from "./WalletDetailsModal";
import { Token } from "@/types/tokens";
import { useWalletConnectorContext } from "@/contexts/WalletConnectorContext";
import { imua } from "@/types/networks";
import { useDisconnect } from "wagmi";
import Image from "next/image";

export function MultiWalletStatus({ token }: { token: Token }) {
  const {
    isReady,
    isNativeWalletConnected,
    nativeWalletAddress,
    nativeCurrencyBalance,
    isImuaConnected,
    boundAddress,
    issues,
    connectNative,
    disconnectNative,
    checkNativeInstallation,
  } = useWalletConnectorContext();
  const { disconnect } = useDisconnect();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeWalletInfo, setActiveWalletInfo] = useState<{
    address: string;
    name: string;
    iconUrl: string;
    balance?: { formatted: string };
    explorerUrl?: string;
    onDisconnect: () => Promise<void> | void;
  } | null>(null);
  const [isNativeWalletInstalled, setIsNativeWalletInstalled] = useState(true);

  // Check if we need to show both native and Imua wallets
  const requiresExtraConnectToImua = token.connector.requireExtraConnectToImua;
  const hasCustomConnector = !!token.connector.customConnector;

  // Get custom connector info if available
  const connectorName = token.connector.customConnector?.name || "EVM Wallet";
  const connectorIcon =
    token.connector.customConnector?.iconUrl || "/eth-logo.svg";

  // Function to open the modal for a specific wallet type
  const openWalletDetails = (isNativeWallet: boolean) => {
    if (isNativeWallet) {
      // Native wallet details
      setActiveWalletInfo({
        address: nativeWalletAddress || "",
        name: token.connector.customConnector?.name || "EVM" + " Wallet",
        iconUrl: token.connector.customConnector?.iconUrl || "/eth-logo.svg",
        balance: nativeCurrencyBalance
          ? {
              formatted:
                formatBalance(
                  nativeCurrencyBalance.value,
                  nativeCurrencyBalance.decimals,
                ) +
                " " +
                nativeCurrencyBalance.symbol,
            }
          : undefined,
        explorerUrl: token.network.accountExplorerUrl,
        onDisconnect: async () => {
          if (disconnectNative) {
            await disconnectNative();
          }
        },
      });
    } else {
      // Imua wallet details
      setActiveWalletInfo({
        address: boundAddress || "",
        name: "Imua Chain Wallet",
        iconUrl: "/eth-logo.svg",
        explorerUrl: imua.accountExplorerUrl,
        onDisconnect: () => {
          disconnect();
        },
      });
    }

    setModalOpen(true);
    setDetailsOpen(false); // Close the dropdown
  };

  // Check if native wallet is installed
  useEffect(() => {
    const checkInstallation = async () => {
      if (checkNativeInstallation) {
        const installed = await checkNativeInstallation();
        setIsNativeWalletInstalled(installed);
      }
    };

    checkInstallation();
  }, [checkNativeInstallation]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-[320px] h-[40px]" />;

  return (
    <div className="relative">
      {/* Compact Status Display */}
      <button
        onClick={() => setDetailsOpen(!detailsOpen)}
        className="bg-[#15151c] hover:bg-[#1a1a24] text-white rounded-lg px-4 py-2 flex items-center gap-2 border border-[#21212f]"
      >
        {/* Native Wallet Status */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#292936] flex items-center justify-center">
            <Image
              src={connectorIcon}
              alt={connectorName}
              className="w-4 h-4"
            />
          </div>
          <span className="text-sm">
            {isNativeWalletConnected
              ? `${nativeWalletAddress?.substring(0, 6)}...${nativeWalletAddress?.substring(nativeWalletAddress.length - 4)}`
              : "Not Connected"}
          </span>

          {/* Show balance if connected */}
          {isNativeWalletConnected && nativeCurrencyBalance && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#292936]">
              {formatBalance(
                nativeCurrencyBalance.value,
                nativeCurrencyBalance.decimals,
              )}{" "}
              {nativeCurrencyBalance.symbol}
            </span>
          )}
        </div>

        {/* Show Imua wallet status if needed */}
        {requiresExtraConnectToImua && (
          <>
            <div className="h-5 w-px bg-[#21212f]" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#292936] flex items-center justify-center">
                <Image src="/eth-logo.svg" alt="Imua" className="w-4 h-4" />
              </div>
              <span className="text-sm">
                {isImuaConnected
                  ? `${boundAddress?.substring(0, 6)}...${boundAddress?.substring(boundAddress.length - 4)}`
                  : "Not Connected"}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#292936]">
                Imua
              </span>
            </div>
          </>
        )}

        {/* Connection Status Indicator */}
        {requiresExtraConnectToImua && (
          <div className="ml-1">
            {isReady ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : isNativeWalletConnected && isImuaConnected ? (
              <AlertCircle className="w-4 h-4 text-yellow-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-gray-400" />
            )}
          </div>
        )}

        <ChevronDown className="w-4 h-4 ml-1" />
      </button>

      {/* Expanded Wallet Details */}
      <AnimatePresence>
        {detailsOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute right-0 mt-2 w-80 bg-[#15151c] rounded-lg shadow-lg border border-[#21212f] z-50"
          >
            <div className="p-4 space-y-4">
              {/* Native Wallet Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <Image
                      src={connectorIcon}
                      alt={connectorName}
                      className="w-4 h-4"
                    />
                    {connectorName}
                  </h3>

                  <div
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isNativeWalletConnected
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {isNativeWalletConnected ? "Connected" : "Not Connected"}
                  </div>
                </div>

                {isNativeWalletConnected ? (
                  <div className="space-y-2">
                    <div
                      className="text-sm text-[#9999aa] bg-[#1a1a24] p-2 rounded flex items-center justify-between cursor-pointer hover:bg-[#21212f]"
                      onClick={() => openWalletDetails(true)}
                    >
                      <span>
                        {nativeWalletAddress?.substring(0, 12)}...
                        {nativeWalletAddress?.substring(
                          nativeWalletAddress.length - 8,
                        )}
                      </span>
                      <span className="text-xs">View Details</span>
                    </div>

                    {/* Show balance */}
                    {nativeCurrencyBalance && (
                      <div className="text-sm text-[#9999aa] bg-[#1a1a24] p-2 rounded flex items-center justify-between">
                        <span>Balance</span>
                        <span>
                          {formatBalance(
                            nativeCurrencyBalance.value,
                            nativeCurrencyBalance.decimals,
                          )}{" "}
                          {nativeCurrencyBalance.symbol}
                        </span>
                      </div>
                    )}
                  </div>
                ) : !isNativeWalletInstalled && hasCustomConnector ? (
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-xs text-[#9999aa]">
                      {connectorName} is not installed
                    </span>
                    <a
                      href={token.connector.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm bg-[#00e5ff] text-black font-medium px-3 py-1.5 rounded"
                    >
                      Install {connectorName}
                    </a>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    {hasCustomConnector ? (
                      <button
                        onClick={() => connectNative && connectNative()}
                        className="text-sm bg-[#00e5ff] text-black font-medium px-3 py-1.5 rounded"
                      >
                        Connect
                      </button>
                    ) : (
                      <ConnectButton.Custom>
                        {({ openConnectModal }) => (
                          <button
                            onClick={openConnectModal}
                            className="text-sm bg-[#00e5ff] text-black font-medium px-3 py-1.5 rounded"
                          >
                            Connect
                          </button>
                        )}
                      </ConnectButton.Custom>
                    )}
                  </div>
                )}
              </div>

              {/* Imua Wallet Section (if required) */}
              {requiresExtraConnectToImua && (
                <div className="space-y-2 pt-3 border-t border-[#21212f]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-white flex items-center gap-2">
                      <Image
                        src="/eth-logo.svg"
                        alt="Imua"
                        className="w-4 h-4"
                      />
                      Imua Chain Wallet
                    </h3>

                    <div
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isImuaConnected
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {isImuaConnected ? "Connected" : "Not Connected"}
                    </div>
                  </div>

                  {isImuaConnected ? (
                    <div className="space-y-2">
                      <div
                        className="text-sm text-[#9999aa] bg-[#1a1a24] p-2 rounded flex items-center justify-between cursor-pointer hover:bg-[#21212f]"
                        onClick={() => openWalletDetails(false)}
                      >
                        <span>
                          {boundAddress?.substring(0, 12)}...
                          {boundAddress?.substring(boundAddress.length - 8)}
                        </span>
                        <span className="text-xs">View Details</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <ConnectButton.Custom>
                        {({ openConnectModal }) => (
                          <button
                            onClick={openConnectModal}
                            className="text-sm bg-[#00e5ff] text-black font-medium px-3 py-1.5 rounded"
                          >
                            Connect
                          </button>
                        )}
                      </ConnectButton.Custom>
                    </div>
                  )}
                </div>
              )}

              {/* Wallet Status Summary (for non-EVM wallets) */}
              {requiresExtraConnectToImua &&
                isNativeWalletConnected &&
                isImuaConnected && (
                  <div
                    className={`p-3 rounded text-sm ${
                      isReady
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                    }`}
                  >
                    {isReady ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>Wallets are paired successfully</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>
                          {issues?.needsMatchingBoundAddress
                            ? "Wallets need to be paired. Make a deposit to link wallets."
                            : issues?.others?.[0] ||
                              "Connection issue detected"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallet Details Modal */}
      {activeWalletInfo && (
        <WalletDetailsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          walletInfo={activeWalletInfo}
        />
      )}
    </div>
  );
}

// Helper function to format balance
function formatBalance(value: bigint, decimals: number): string {
  if (!value) return "0";

  const divisor = BigInt(10) ** BigInt(decimals);
  const integerPart = value / divisor;
  const decimalPart = (value % divisor)
    .toString()
    .padStart(decimals, "0")
    .substring(0, 2);

  return `${integerPart}.${decimalPart}`;
}
