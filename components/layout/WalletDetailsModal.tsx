// components/layout/WalletDetailsModal.tsx
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, X, ExternalLink, CheckCircle } from "lucide-react";
import Image from "next/image";
import { ActionButton } from "@/components/ui/action-button";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-[#15151c] border border-[rgba(255,255,255,0.1)] rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="relative p-6 border-b border-[rgba(255,255,255,0.1)]">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-[#9999aa] hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#292936] flex items-center justify-center">
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
            <div className="p-6 space-y-6">
              {/* Address */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                  {walletInfo.address
                    ? `${walletInfo.address.substring(0, 6)}...${walletInfo.address.substring(walletInfo.address.length - 4)}`
                    : "Not Connected"}
                </h3>
                <div className="text-[#9999aa] text-sm">{walletInfo.name}</div>
              </div>

              {/* Balance */}
              {walletInfo.balance?.formatted && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">
                    {walletInfo.balance.formatted}
                  </div>
                  <div className="text-xs text-[#9999aa]">Balance</div>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <ActionButton
                  onClick={copyAddress}
                  variant="secondary"
                  size="sm"
                  disabled={!walletInfo.address}
                  className="flex items-center justify-center space-x-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle size={18} className="text-green-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} className="text-[#9999aa]" />
                      <span>Copy Address</span>
                    </>
                  )}
                </ActionButton>

                <ActionButton
                  onClick={openExplorer}
                  variant="secondary"
                  size="sm"
                  disabled={!walletInfo.explorerUrl}
                  className="flex items-center justify-center space-x-2"
                >
                  <ExternalLink size={18} className="text-[#9999aa]" />
                  <span>View in Explorer</span>
                </ActionButton>
              </div>

              {/* Disconnect Button */}
              <ActionButton
                onClick={handleDisconnect}
                variant="outline"
                size="md"
                className="w-full bg-red-900/20 text-red-400 hover:bg-red-900/30 border-red-500/30"
              >
                Disconnect
              </ActionButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
