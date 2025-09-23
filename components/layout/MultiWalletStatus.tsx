// components/layout/MultiWalletStatus.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { WalletDetailsModal } from "./WalletDetailsModal";
import { Token, btc, tbtc } from "@/types/tokens";
import { useWalletConnectorContext } from "@/contexts/WalletConnectorContext";
import { imuaChain } from "@/types/networks";
import Image from "next/image";

export function MultiWalletStatus({ token }: { token: Token }) {
  const {
    isReadyForStaking,
    nativeWallet,
    bindingEVMWallet,
    issues,
    disconnectNative,
    disconnectBindingEVM,
  } = useWalletConnectorContext();

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

  // Check if we need to show both native and Imua wallets
  const requiresExtraConnectToImua =
    token.network.connector.requireExtraConnectToImua;

  // Get custom connector info if available
  const connectorName =
    token.network.connector.customConnector?.name || "EVM Wallet";
  const connectorIcon =
    token.network.connector.customConnector?.iconUrl || "/eth-logo.svg";
  const isBTC = token === btc || token === tbtc;

  // Function to open the modal for a specific wallet type
  const openWalletDetails = (isNativeWallet: boolean) => {
    if (isNativeWallet) {
      // Native wallet details
      setActiveWalletInfo({
        address: nativeWallet.address || "",
        name: token.network.connector.customConnector?.name || "EVM Wallet",
        iconUrl:
          token.network.connector.customConnector?.iconUrl || "/eth-logo.svg",
        balance: nativeWallet.balance
          ? {
              formatted:
                formatBalance(
                  nativeWallet.balance.value,
                  nativeWallet.balance.decimals,
                  isBTC,
                ) +
                " " +
                nativeWallet.balance.symbol,
            }
          : undefined,
        explorerUrl: isBTC
          ? "https://mempool.space/tx/"
          : token.network.accountExplorerUrl,
        onDisconnect: async () => {
          if (disconnectNative) {
            await disconnectNative();
          }
        },
      });
    } else {
      // EVM wallet details
      setActiveWalletInfo({
        address: bindingEVMWallet?.address || "",
        name: "EVM Wallet",
        iconUrl: "/eth-logo.svg",
        balance: bindingEVMWallet?.balance
          ? {
              formatted:
                formatBalance(
                  bindingEVMWallet.balance.value,
                  bindingEVMWallet.balance.decimals,
                  isBTC,
                ) +
                " " +
                bindingEVMWallet.balance.symbol,
            }
          : undefined,
        explorerUrl: imuaChain.accountExplorerUrl,
        onDisconnect: async () => {
          if (disconnectBindingEVM) {
            await disconnectBindingEVM();
          }
        },
      });
    }

    setModalOpen(true);
    setDetailsOpen(false); // Close the dropdown
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-[320px] h-[40px]" />;

  return (
    <div className="relative">
      {/* Compact Status Display */}
      <button
        onClick={() => setDetailsOpen(!detailsOpen)}
        className="bg-[#15151c] hover:bg-[#1a1a24] text-white rounded-lg px-4 py-2 flex items-center gap-2 border border-[#21212f] transition-colors duration-200 hover:border-[#00e5ff]/30"
      >
        {/* Native Wallet Status */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#292936] flex items-center justify-center">
            <Image
              src={connectorIcon}
              alt={connectorName}
              className="w-4 h-4"
              width={16}
              height={16}
            />
          </div>
          <span className="text-sm">
            {nativeWallet.connected
              ? `${nativeWallet.address?.substring(0, 6)}...${nativeWallet.address?.substring(nativeWallet.address.length - 4)}`
              : "Not Connected"}
          </span>

          {/* Show balance if connected */}
          {nativeWallet.connected && nativeWallet.balance && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#292936]">
              {formatBalance(
                nativeWallet.balance.value,
                nativeWallet.balance.decimals,
                isBTC,
              )}{" "}
              {nativeWallet.balance.symbol}
            </span>
          )}
        </div>

        {/* Show Imua wallet status if needed */}
        {requiresExtraConnectToImua && (
          <>
            <div className="h-5 w-px bg-[#21212f]" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#292936] flex items-center justify-center">
                <Image
                  src="/eth-logo.svg"
                  alt="Imua"
                  className="w-4 h-4"
                  width={16}
                  height={16}
                />
              </div>
              <span className="text-sm">
                {bindingEVMWallet?.connected
                  ? `${bindingEVMWallet.address?.substring(0, 6)}...${bindingEVMWallet.address?.substring(bindingEVMWallet.address.length - 4)}`
                  : "Not Connected"}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#292936]">
                EVM
              </span>
            </div>
          </>
        )}

        {/* Connection Status Indicator */}
        {requiresExtraConnectToImua && (
          <div className="ml-1">
            {isReadyForStaking ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : nativeWallet.connected && bindingEVMWallet?.connected ? (
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
            className="absolute right-0 mt-2 w-80 bg-[#15151c] rounded-lg shadow-xl border border-[#21212f] z-50 backdrop-blur-sm"
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
                      width={16}
                      height={16}
                    />
                    {connectorName}
                  </h3>

                  <div
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      nativeWallet.connected
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {nativeWallet.connected ? "Connected" : "Not Connected"}
                  </div>
                </div>

                {nativeWallet.connected ? (
                  <div className="space-y-2">
                    <div
                      className="text-sm text-[#9999aa] bg-[#1a1a24] p-2 rounded flex items-center justify-between cursor-pointer hover:bg-[#21212f] transition-colors"
                      onClick={() => openWalletDetails(true)}
                    >
                      <span>
                        {nativeWallet.address?.substring(0, 12)}...
                        {nativeWallet.address?.substring(
                          nativeWallet.address.length - 8,
                        )}
                      </span>
                      <span className="text-xs text-[#00e5ff]">
                        View Details
                      </span>
                    </div>

                    {/* Show balance */}
                    {nativeWallet.balance && (
                      <div className="text-sm text-[#9999aa] bg-[#1a1a24] p-2 rounded flex items-center justify-between">
                        <span>Balance</span>
                        <span className="font-medium">
                          {formatBalance(
                            nativeWallet.balance.value,
                            nativeWallet.balance.decimals,
                            isBTC,
                          )}{" "}
                          {nativeWallet.balance.symbol}
                        </span>
                      </div>
                    )}
                  </div>
                ) : issues?.needsInstallNative ? (
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-xs text-[#9999aa]">
                      {connectorName} is not installed
                    </span>
                    <ActionButton
                      onClick={() =>
                        window.open(
                          token.network.connector.installUrl,
                          "_blank",
                        )
                      }
                      variant="primary"
                      size="sm"
                    >
                      Install {connectorName}
                    </ActionButton>
                  </div>
                ) : issues?.needsConnectNative ? (
                  <div className="flex justify-center">
                    {issues.needsConnectNative.resolve ? (
                      <ActionButton
                        onClick={() => issues.needsConnectNative!.resolve!()}
                        variant="primary"
                        size="sm"
                      >
                        Connect {connectorName}
                      </ActionButton>
                    ) : (
                      <div className="text-center">
                        <p className="text-xs text-[#9999aa] mb-2">
                          Please manually connect your {connectorName} wallet
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-[#9999aa] mb-2">
                      Please connect your {connectorName} wallet
                    </p>
                  </div>
                )}
              </div>

              {/* EVM Wallet Section (if required) */}
              {requiresExtraConnectToImua && (
                <div className="space-y-2 pt-3 border-t border-[#21212f]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-white flex items-center gap-2">
                      <Image
                        src="/eth-logo.svg"
                        alt="EVM"
                        className="w-4 h-4"
                        width={16}
                        height={16}
                      />
                      EVM Wallet
                    </h3>

                    <div
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        bindingEVMWallet?.connected
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {bindingEVMWallet?.connected
                        ? "Connected"
                        : "Not Connected"}
                    </div>
                  </div>

                  {bindingEVMWallet?.connected ? (
                    <div className="space-y-2">
                      <div
                        className="text-sm text-[#9999aa] bg-[#1a1a24] p-2 rounded flex items-center justify-between cursor-pointer hover:bg-[#21212f] transition-colors"
                        onClick={() => openWalletDetails(false)}
                      >
                        <span>
                          {bindingEVMWallet.address?.substring(0, 12)}...
                          {bindingEVMWallet.address?.substring(
                            bindingEVMWallet.address.length - 8,
                          )}
                        </span>
                        <span className="text-xs text-[#00e5ff]">
                          View Details
                        </span>
                      </div>

                      {/* Show balance */}
                      {bindingEVMWallet.balance && (
                        <div className="text-sm text-[#9999aa] bg-[#1a1a24] p-2 rounded flex items-center justify-between">
                          <span>Balance</span>
                          <span className="font-medium">
                            {formatBalance(
                              bindingEVMWallet.balance.value,
                              bindingEVMWallet.balance.decimals,
                              isBTC,
                            )}{" "}
                            {bindingEVMWallet.balance.symbol}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : issues?.needsConnectBindingEVM ? (
                    <div className="flex justify-center">
                      {issues.needsConnectBindingEVM.resolve ? (
                        <ActionButton
                          onClick={() =>
                            issues.needsConnectBindingEVM!.resolve!()
                          }
                          variant="primary"
                          size="sm"
                        >
                          Connect EVM Wallet
                        </ActionButton>
                      ) : (
                        <div className="text-center">
                          <p className="text-xs text-[#9999aa] mb-2">
                            Please manually connect your EVM wallet
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-xs text-[#9999aa] mb-2">
                        Please connect your EVM wallet
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Wallet Status Summary (for dual-wallet scenarios) */}
              {requiresExtraConnectToImua &&
                nativeWallet.connected &&
                bindingEVMWallet?.connected && (
                  <div
                    className={`p-3 rounded text-sm ${
                      isReadyForStaking
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                    }`}
                  >
                    {isReadyForStaking ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>Wallets are paired successfully</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>
                          {issues?.needsMatchingAddress
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
function formatBalance(
  value: bigint,
  decimals: number,
  isBTC: boolean,
): string {
  if (!value) return "0";

  const divisor = BigInt(10) ** BigInt(decimals);
  const integerPart = value / divisor;
  const decimalPart = (value % divisor).toString().padStart(decimals, "0");

  // For Bitcoin (8 decimals), show more precision for small amounts
  const significantDecimals = isBTC ? 6 : 2;
  const trimmedDecimalPart = decimalPart.substring(0, significantDecimals);

  // Remove trailing zeros
  const cleanDecimalPart = trimmedDecimalPart.replace(/0+$/, "") || "0";

  return `${integerPart}.${cleanDecimalPart}`;
}
