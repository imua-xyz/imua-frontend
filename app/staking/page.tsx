// app/new-staking/staking/page.tsx (refined)
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { validTokens, Token } from "@/types/tokens";
import { StakingServiceProvider } from "@/components/providers/StakingServiceProvider";
import { OperatorsProvider } from "@/components/providers/OperatorsProvider";
import { WalletConnectionModal } from "@/components/modals/WalletConnectionModal";
import { TokenSelectorModal } from "@/components/modals/TokenSelectorModal";
import { StakeTab } from "@/components/tabs/StakeTab";
import { DelegateTab } from "@/components/tabs/DelegateTab";
import { UndelegateTab } from "@/components/tabs/UndelegateTab";
import { WithdrawTab } from "@/components/tabs/WithdrawTab";
import { Header } from "@/components/layout/header";
import { WalletConnectorProvider } from "@/components/providers/WalletConnectorProvider";
import { useWalletConnectorContext } from "@/contexts/WalletConnectorContext";
import Image from "next/image";
import { BootstrapPhaseBanner } from "@/components/BootstrapPhaseBanner";
import { useBootstrapStatus } from "@/hooks/useBootstrapStatus";
import { useSyncAllWalletsToStore } from "@/hooks/useSyncAllWalletsToStore";
import { AlertCircle } from "lucide-react";
import { BootstrapStatus } from "@/types/bootstrap-status";

type TabType = "stake" | "delegate" | "undelegate" | "withdraw";

// Main content component that uses the staking service
function StakingContent({
  selectedToken,
  bootstrapStatus,
}: {
  selectedToken: Token;
  bootstrapStatus: BootstrapStatus;
}) {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabType>("stake");

  // Read initial tab from localStorage (set by dashboard navigation)
  useEffect(() => {
    try {
      const storedTab = localStorage.getItem("initialStakingTab");
      if (
        storedTab &&
        ["stake", "delegate", "undelegate", "withdraw"].includes(storedTab)
      ) {
        setCurrentTab(storedTab as TabType);
        // Clear the stored tab after reading
        localStorage.removeItem("initialStakingTab");
      }
    } catch (error) {
      console.error("Error reading initial staking tab:", error);
    }
  }, []);

  const walletConnector = useWalletConnectorContext();
  const isWalletConnected = walletConnector.isReadyForStaking;

  // Determine available tabs based on bootstrap status and connector type
  const availableTabs = useMemo(() => {
    const isBootstrapped = bootstrapStatus?.isBootstrapped || false;
    const requiresExtraConnect =
      selectedToken.network.connector?.requireExtraConnectToImua || false;

    // Default tabs for all scenarios
    const tabs = [{ id: "stake", label: "Stake" }];

    // Only add other tabs if bootstrapped or if the connector doesn't require extra connection
    if (isBootstrapped || !requiresExtraConnect) {
      tabs.push(
        { id: "delegate", label: "Delegate" },
        { id: "undelegate", label: "Undelegate" },
        { id: "withdraw", label: "Withdraw" },
      );
    }

    return tabs;
  }, [bootstrapStatus, selectedToken.network.connector]);

  // Reset to stake tab if current tab becomes unavailable
  useEffect(() => {
    const tabExists = availableTabs.some((tab) => tab.id === currentTab);
    if (!tabExists) {
      setCurrentTab("stake");
    }
  }, [availableTabs, currentTab]);

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
              {selectedToken.symbol} assets
            </p>
          </div>

          <ActionButton
            onClick={handleConnectWallet}
            variant="primary"
            size="lg"
            className="flex items-center gap-3"
          >
            Connect Wallet
            <svg
              className="w-5 h-5 transition-transform group-hover:translate-x-1"
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
          </ActionButton>

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

    // Determine source and destination chains based on bootstrap status
    const isBootstrapped = bootstrapStatus?.isBootstrapped || false;

    switch (currentTab) {
      case "stake":
        // For stake, if not bootstrapped, both source and destination are the token's native chain
        return (
          <StakeTab
            sourceChain={selectedToken.network.chainName.toLowerCase()}
            destinationChain={
              isBootstrapped
                ? "imua"
                : selectedToken.network.chainName.toLowerCase()
            }
          />
        );
      case "delegate":
        return (
          <DelegateTab
            sourceChain={selectedToken.network.chainName.toLowerCase()}
            destinationChain={
              isBootstrapped
                ? "imua"
                : selectedToken.network.chainName.toLowerCase()
            }
          />
        );
      case "undelegate":
        return (
          <UndelegateTab
            sourceChain={selectedToken.network.chainName.toLowerCase()}
            destinationChain={
              isBootstrapped
                ? "imua"
                : selectedToken.network.chainName.toLowerCase()
            }
          />
        );
      case "withdraw":
        return (
          <WithdrawTab
            sourceChain={selectedToken.network.chainName.toLowerCase()}
            destinationChain={
              isBootstrapped
                ? "imua"
                : selectedToken.network.chainName.toLowerCase()
            }
          />
        );
    }
  };

  return (
    <>
      {/* Operation Tabs - Refined tab design */}
      <div className="mb-8">
        <div className="flex border-b border-[#222233]">
          {availableTabs.map((tab) => (
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
        token={selectedToken}
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onSuccess={() => setIsWalletModalOpen(false)}
        onReopen={() => setIsWalletModalOpen(true)}
      />
    </>
  );
}

// Main page component
export default function StakingPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token>(validTokens[0]);
  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
  const { bootstrapStatus } = useBootstrapStatus();

  // Sync wallet state
  useSyncAllWalletsToStore();

  useEffect(() => {
    setMounted(true);

    // Read selected token and tab from localStorage (set by dashboard navigation)
    try {
      const storedToken = localStorage.getItem("selectedStakingToken");
      const storedTab = localStorage.getItem("selectedStakingTab");

      if (storedToken) {
        const parsedToken = JSON.parse(storedToken);
        // Find the token in validTokens to ensure it's valid
        const foundToken = validTokens.find(
          (t) => t.symbol === parsedToken.symbol,
        );
        if (foundToken) {
          setSelectedToken(foundToken);
        }
        // Clear the stored token after reading
        localStorage.removeItem("selectedStakingToken");
      }

      if (storedTab) {
        // Store the tab for the StakingContent component to read
        localStorage.setItem("initialStakingTab", storedTab);
        // Clear the stored tab after reading
        localStorage.removeItem("selectedStakingTab");
      }
    } catch (error) {
      console.error("Error reading stored staking preferences:", error);
    }
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <WalletConnectorProvider token={selectedToken}>
        <Header token={selectedToken} />

        {/* Main content area - always show, handle bootstrap status inside */}
        <div className="max-w-xl mx-auto px-6 py-12">
          {bootstrapStatus && (
            <BootstrapPhaseBanner bootstrapStatus={bootstrapStatus} />
          )}

          {!bootstrapStatus?.isLocked && (
            <div className="bg-[#13131a] rounded-2xl overflow-hidden shadow-xl">
              {/* Card header with token selector - simplified */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#222233]">
                <h2 className="text-xl font-bold text-white">Stake Assets</h2>
                <button
                  onClick={() => setIsTokenSelectorOpen(true)}
                  className="flex items-center bg-[#1a1a24] hover:bg-[#222233] rounded-xl text-white px-3 py-2"
                >
                  <Image
                    src={selectedToken.iconUrl}
                    alt={selectedToken.symbol}
                    className="w-5 h-5 mr-2"
                    width={20}
                    height={20}
                  />
                  <span className="font-medium">{selectedToken.symbol}</span>
                  <ChevronDown size={16} className="ml-2 text-[#9999aa]" />
                </button>
              </div>

              {/* Card body with staking content */}
              <div className="p-6">
                <StakingServiceProvider token={selectedToken}>
                  <OperatorsProvider>
                    <StakingContent
                      selectedToken={selectedToken}
                      bootstrapStatus={
                        bootstrapStatus || {
                          isBootstrapped: false,
                          isLocked: false,
                          spawnTime: 0,
                          offsetDuration: 0,
                          phase: "pre-lock",
                        }
                      }
                    />
                  </OperatorsProvider>
                </StakingServiceProvider>
              </div>
            </div>
          )}

          {/* Show additional message when locked */}
          {bootstrapStatus?.isLocked && (
            <div className="bg-[#13131a] rounded-2xl overflow-hidden shadow-xl mt-6 p-8 text-center">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 mb-4 flex items-center justify-center rounded-full bg-amber-950/20">
                  <AlertCircle className="text-amber-400" size={32} />
                </div>
                <h3 className="text-white text-xl font-medium mb-3">
                  Staking is Currently Disabled
                </h3>
                <p className="text-[#9999aa] max-w-md">
                  During this bootstrap phase, staking operations are
                  temporarily disabled. You&apos;ll be able to stake again once
                  the network is fully operational.
                </p>
              </div>
            </div>
          )}
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
      </WalletConnectorProvider>
    </div>
  );
}
