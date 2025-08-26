// components/layout/WalletDetailsModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, X, ExternalLink, CheckCircle } from "lucide-react";
import Image from "next/image";

interface WalletDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletInfo: {
    address: string;
    name: string;
    iconUrl: string;
    balance?: {
      formatted: string;
    };
    explorerUrl?: string;
    onDisconnect: () => Promise<void> | void;
  };
}

export function WalletDetailsModal({
  isOpen,
  onClose,
  walletInfo,
}: WalletDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (walletInfo.address) {
      navigator.clipboard.writeText(walletInfo.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    await walletInfo.onDisconnect();
    onClose();
  };

  const openExplorer = () => {
    if (walletInfo.explorerUrl) {
      window.open(`${walletInfo.explorerUrl}${walletInfo.address}`, "_blank");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-[#15151c] rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
          >
            {/* Header */}
            <div className="relative p-6 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
                  <Image
                    src={walletInfo.iconUrl}
                    alt={walletInfo.name}
                    className="w-6 h-6"
                    width={24}
                    height={24}
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Address */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {walletInfo.address
                    ? `${walletInfo.address.substring(0, 6)}...${walletInfo.address.substring(walletInfo.address.length - 4)}`
                    : "Not Connected"}
                </h3>
                <div className="text-gray-600 dark:text-gray-400 text-sm">
                  {walletInfo.name}
                </div>
              </div>

              {/* Balance */}
              {walletInfo.balance?.formatted && (
                <div className="text-center text-2xl font-bold text-gray-900 dark:text-white">
                  {walletInfo.balance.formatted}
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={copyAddress}
                  className="flex items-center justify-center space-x-2 bg-gray-100 dark:bg-[#1a1a24] hover:bg-gray-200 dark:hover:bg-[#21212f] transition-colors rounded-xl py-3 px-4"
                  disabled={!walletInfo.address}
                >
                  {copied ? (
                    <>
                      <CheckCircle size={18} className="text-green-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Copied
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy
                        size={18}
                        className="text-gray-500 dark:text-gray-400"
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Copy Address
                      </span>
                    </>
                  )}
                </button>

                <button
                  onClick={openExplorer}
                  className="flex items-center justify-center space-x-2 bg-gray-100 dark:bg-[#1a1a24] hover:bg-gray-200 dark:hover:bg-[#21212f] transition-colors rounded-xl py-3 px-4"
                  disabled={!walletInfo.explorerUrl}
                >
                  <ExternalLink
                    size={18}
                    className="text-gray-500 dark:text-gray-400"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    View in Explorer
                  </span>
                </button>
              </div>

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                className="w-full mt-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
