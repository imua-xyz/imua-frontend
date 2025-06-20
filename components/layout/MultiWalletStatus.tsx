// components/layout/MultiWalletStatus.tsx
"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useGemWalletStore } from "@/stores/gemWalletClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  CheckCircle,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { WalletDetailsModal } from "./WalletDetailsModal";
import { Token, xrp } from "@/types/tokens";
import { useAccount } from "wagmi";
import { useBindingStore } from "@/stores/bindingClient";

export function MultiWalletStatus({ token }: { token: Token }) {
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const isXrpConnected = useGemWalletStore(state => state.isWalletConnected); 
  const xrpAddress = useGemWalletStore(state => state.userAddress);
  const isXrpInstalled = useGemWalletStore(state => state.installed);
  const connectXrp = useGemWalletStore(state => state.connect);
  const boundImuaAddress = useBindingStore(state => state.boundAddresses[xrpAddress ?? ""]);
  const arePaired = Boolean(
    isEvmConnected && 
    isXrpConnected && 
    boundImuaAddress && 
    evmAddress && 
    boundImuaAddress.toLowerCase() === evmAddress.toLowerCase()
  );

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Add state for the wallet details modal
  const [modalOpen, setModalOpen] = useState(false);
  const [activeWalletType, setActiveWalletType] = useState<"evm" | "xrp">(
    "evm",
  );

  // Function to open the modal for a specific wallet type
  const openWalletDetails = (type: "evm" | "xrp") => {
    setActiveWalletType(type);
    setModalOpen(true);
    setDetailsOpen(false); // Close the dropdown
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-[320px] h-[40px]" />;

  // Only show XRP wallet status if XRP token is selected
  const showXrpWallet = token === xrp;

  return (
    <div className="relative">
      {/* Compact Status Display */}
      <button
        onClick={() => setDetailsOpen(!detailsOpen)}
        className="bg-[#15151c] hover:bg-[#1a1a24] text-white rounded-lg px-4 py-2 flex items-center gap-2 border border-[#21212f]"
      >
        {/* Ethereum Wallet Status */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#292936] flex items-center justify-center">
            <img src="/eth-logo.svg" alt="ETH" className="w-4 h-4" />
          </div>
          <span className="text-sm">
            {isEvmConnected
              ? `${evmAddress?.substring(0, 6)}...${evmAddress?.substring(evmAddress.length - 4)}`
              : "Not Connected"}
          </span>
          {isEvmConnected && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#292936]">
              Imua
            </span>
          )}
        </div>

        {/* Show XRP status if relevant */}
        {showXrpWallet && (
          <>
            <div className="h-5 w-px bg-[#21212f]" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#292936] flex items-center justify-center">
                <img src="/xrp-logo.svg" alt="XRP" className="w-4 h-4" />
              </div>
              <span className="text-sm">
                {isXrpConnected
                  ? `${xrpAddress?.substring(0, 6)}...${xrpAddress?.substring(xrpAddress.length - 4)}`
                  : "Not Connected"}
              </span>
            </div>
          </>
        )}

        {/* Connection Status Indicator */}
        {showXrpWallet && (
          <div className="ml-1">
            {isEvmConnected && isXrpConnected ? (
              arePaired ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-400" />
              )
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
              {/* EVM Wallet Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <img src="/eth-logo.svg" alt="ETH" className="w-4 h-4" />
                    Imua Chain Wallet
                  </h3>

                  <div
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isEvmConnected
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {isEvmConnected ? "Connected" : "Not Connected"}
                  </div>
                </div>

                {isEvmConnected ? (
                  <div className="space-y-2">
                    <div
                      className="text-sm text-[#9999aa] bg-[#1a1a24] p-2 rounded flex items-center justify-between cursor-pointer hover:bg-[#21212f]"
                      onClick={() => openWalletDetails("evm")}
                    >
                      <span>
                        {evmAddress?.substring(0, 12)}...
                        {evmAddress?.substring(evmAddress.length - 8)}
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

              {/* XRP Wallet Section (if relevant) */}
              {showXrpWallet && (
                <div className="space-y-2 pt-3 border-t border-[#21212f]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-white flex items-center gap-2">
                      <img src="/xrp-logo.svg" alt="XRP" className="w-4 h-4" />
                      XRP Wallet
                    </h3>

                    <div
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isXrpConnected
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {isXrpConnected ? "Connected" : "Not Connected"}
                    </div>
                  </div>

                  {isXrpConnected ? (
                    <div className="space-y-2">
                      <div
                        className="text-sm text-[#9999aa] bg-[#1a1a24] p-2 rounded flex items-center justify-between cursor-pointer hover:bg-[#21212f]"
                        onClick={() => openWalletDetails("xrp")}
                      >
                        <span>
                          {xrpAddress?.substring(0, 12)}...
                          {xrpAddress?.substring(xrpAddress.length - 8)}
                        </span>
                        <span className="text-xs">View Details</span>
                      </div>
                    </div>
                  ) : !isXrpInstalled ? (
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-xs text-[#9999aa]">
                        GemWallet is not installed
                      </span>
                      <a
                        href="https://gemwallet.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm bg-[#00e5ff] text-black font-medium px-3 py-1.5 rounded"
                      >
                        Install GemWallet
                      </a>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <button
                        onClick={() => connectXrp()}
                        className="text-sm bg-[#00e5ff] text-black font-medium px-3 py-1.5 rounded"
                      >
                        Connect
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Wallet Status Summary (for XRP) */}
              {showXrpWallet && isEvmConnected && isXrpConnected && (
                <div
                  className={`p-3 rounded text-sm ${
                    arePaired
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                  }`}
                >
                  {arePaired ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Wallets are paired successfully</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        Wallets need to be paired. Make a deposit to link
                        wallets.
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
      <WalletDetailsModal
        token={token}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        walletType={activeWalletType}
      />
    </div>
  );
}
