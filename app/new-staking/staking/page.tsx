// app/staking/page.tsx
"use client";

import { useState, useEffect, useContext } from "react";
import { TokenSelector } from "@/components/new-staking/TokenSelector";
import { ConnectWalletButton } from "@/components/new-staking/ConnectWalletButton";
import { WalletConnectionModal } from "@/components/new-staking/modals/WalletConnectionModal";
import { OperationTabs } from "@/components/new-staking/OperationTabs";
import { motion, AnimatePresence } from "framer-motion";
import { validTokens, Token, NativeToken, LSTToken, NSTToken } from "@/types/tokens";
import { StakingServiceProvider } from "@/components/new-staking/providers/StakingServiceProvider";
import { Header } from "@/components/layout/header";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { OperatorsProvider } from "@/components/new-staking/providers/OperatorsProvider";

// A wrapper component to access the staking service context
function StakingContent() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<string | null>("stake");
  
  // Get the staking service context
  const stakingService = useStakingServiceContext();
  const { connectionStatus, token } = stakingService;
  
  // Use isReady from connectionStatus to determine if wallet is connected
  const isWalletConnected = connectionStatus.isReady;
  console.log("DEBUG: isWalletConnected", isWalletConnected);

  // Handler for wallet connection button
  const handleConnectWallet = () => {
    setIsWalletModalOpen(true);
  };

  // Handler for successful wallet connection
  const handleWalletConnected = () => {
    setIsWalletModalOpen(false);
  };

  return (
    <>
      {/* Connect Wallet Button - Only show if wallet is not connected and token selected*/}
      {!isWalletConnected && token && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-8"
        >
          <ConnectWalletButton
            onClick={handleConnectWallet}
            token={token}
          />
        </motion.div>
      )}

      {/* Operation Tabs - Only show if wallet is connected */}
      {isWalletConnected && token && (
        <OperationTabs
          sourceChain="ethereum"
          destinationChain="imua"
          onSuccess={() => console.log("Operation success")}
        />
      )}

      {/* Wallet Connection Modal */}
      <AnimatePresence>
        {isWalletModalOpen && (
          <WalletConnectionModal
            isOpen={isWalletModalOpen}
            onClose={() => setIsWalletModalOpen(false)}
            onSuccess={handleWalletConnected}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Main page component
export default function StakingPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  console.log("DEBUG: StakingPage is rendered");

  return (
    <div>
      <Header token={selectedToken} />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-[#0d0d14] rounded-xl border border-[rgba(255,255,255,0.05)] p-6 shadow-lg">
          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-6">Stake Assets</h2>

          {/* Token Selector */}
          <div className="mb-6">
            <label className="block text-sm text-[#9999aa] mb-2">
              Select Token
            </label>
            <TokenSelector
              selectedToken={selectedToken}
              onTokenSelect={setSelectedToken}
            />
          </div>

          {/* Staking content - Only render if a token is selected */}
          {selectedToken && (
            <StakingServiceProvider token={selectedToken}>
              <OperatorsProvider>
                <StakingContent />
              </OperatorsProvider>
            </StakingServiceProvider>
          )}
        </div>
      </div>
    </div>
  );
}