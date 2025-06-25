// app/new-staking/staking/page.tsx (refined)
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { validTokens, Token } from "@/types/tokens";
import { StakingServiceProvider } from "@/components/new-staking/providers/StakingServiceProvider";
import { OperatorsProvider } from "@/components/new-staking/providers/OperatorsProvider";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { WalletConnectionModal } from "@/components/new-staking/modals/WalletConnectionModal";
import { TokenSelectorModal } from "@/components/new-staking/modals/TokenSelectorModal";
import { StakeTab } from "@/components/new-staking/tabs/StakeTab";
import { DelegateTab } from "@/components/new-staking/tabs/DelegateTab";
import { UndelegateTab } from "@/components/new-staking/tabs/UndelegateTab";
import { WithdrawTab } from "@/components/new-staking/tabs/WithdrawTab";
import { Header } from "@/components/layout/header";

type TabType = "stake" | "delegate" | "undelegate" | "withdraw";

// Main content component that uses the staking service
function StakingContent() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabType>("stake");

  const stakingService = useStakingServiceContext();
  const { connectionStatus, token } = stakingService;
  const isWalletConnected = connectionStatus.isReady;

  // Handle wallet connection
  const handleConnectWallet = () => {
    setIsWalletModalOpen(true);
  };

  const renderTabContent = () => {
    if (!isWalletConnected) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-6">
          <div className="text-center max-w-md">
            <h3 className="text-white text-xl font-medium mb-2">
              Connect to Start Staking
            </h3>
            <p className="text-[#9999aa]">
              Connect your wallet to stake, delegate, and earn rewards with your{" "}
              {token.symbol} assets
            </p>
          </div>

          <button
            onClick={handleConnectWallet}
            className="group relative bg-gradient-to-r from-[#00e5ff] to-[#00c8df] hover:from-[#00c8df] hover:to-[#00aabf] text-black font-medium text-base py-3.5 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-[#00e5ff]/20 flex items-center gap-3 overflow-hidden"
          >
            <span className="relative z-10">Connect Wallet</span>
            <svg
              className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
            <div className="absolute inset-0 bg-white/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>

          <div className="flex items-center gap-2 text-xs text-[#9999aa] mt-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Secure connection with your wallet</span>
          </div>
        </div>
      );
    }

    switch (currentTab) {
      case "stake":
        return <StakeTab sourceChain="ethereum" destinationChain="imua" />;
      case "delegate":
        return <DelegateTab sourceChain="imua" destinationChain="imua" />;
      case "undelegate":
        return <UndelegateTab sourceChain="imua" destinationChain="imua" />;
      case "withdraw":
        return <WithdrawTab sourceChain="imua" destinationChain="ethereum" />;
    }
  };

  return (
    <>
      {/* Operation Tabs - Refined tab design */}
      <div className="mb-8">
        <div className="flex border-b border-[#222233]">
          {[
            { id: "stake", label: "Stake" },
            { id: "delegate", label: "Delegate" },
            { id: "undelegate", label: "Undelegate" },
            { id: "withdraw", label: "Withdraw" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`py-4 px-6 text-base font-medium relative ${
                currentTab === tab.id
                  ? "text-[#00e5ff]"
                  : "text-[#9999aa] hover:text-white"
              }`}
              onClick={() => setCurrentTab(tab.id as TabType)}
            >
              {tab.label}
              {currentTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00e5ff]"
                  initial={false}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>

      {/* Wallet Connection Modal */}
      <WalletConnectionModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onSuccess={() => setIsWalletModalOpen(false)}
      />
    </>
  );
}

// Main page component
export default function StakingPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token>(validTokens[0]);
  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Header token={selectedToken} />

      {/* Main content area - cleaner with more focus */}
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="bg-[#13131a] rounded-2xl overflow-hidden shadow-xl">
          {/* Card header with token selector - simplified */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#222233]">
            <h2 className="text-xl font-bold text-white">Stake Assets</h2>
            <button
              onClick={() => setIsTokenSelectorOpen(true)}
              className="flex items-center bg-[#1a1a24] hover:bg-[#222233] rounded-xl text-white px-3 py-2"
            >
              <img
                src={selectedToken.iconUrl}
                alt={selectedToken.symbol}
                className="w-5 h-5 mr-2"
              />
              <span className="font-medium">{selectedToken.symbol}</span>
              <ChevronDown size={16} className="ml-2 text-[#9999aa]" />
            </button>
          </div>

          {/* Card body with staking content */}
          <div className="p-6">
            <StakingServiceProvider token={selectedToken}>
              <OperatorsProvider>
                <StakingContent />
              </OperatorsProvider>
            </StakingServiceProvider>
          </div>
        </div>
      </div>

      {/* Token Selector Modal */}
      <TokenSelectorModal
        isOpen={isTokenSelectorOpen}
        onClose={() => setIsTokenSelectorOpen(false)}
        tokens={validTokens}
        selectedToken={selectedToken}
        onSelectToken={(token) => {
          setSelectedToken(token);
          setIsTokenSelectorOpen(false);
        }}
      />
    </div>
  );
}
