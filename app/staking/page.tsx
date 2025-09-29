// app/new-staking/staking/page.tsx (refined)
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { validTokens, Token } from "@/types/tokens";
import { StakingServiceProvider } from "@/components/providers/StakingServiceProvider";
import { OperatorsProvider } from "@/components/providers/OperatorsProvider";
import { WalletConnectionModal } from "@/components/modals/WalletConnectionModal";
import { TokenSelectorModal } from "@/components/modals/TokenSelectorModal";
import { StakeTab } from "@/components/tabs/StakeTab";
import { StakeNSTTab } from "@/components/tabs/StakeNSTTab";
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
import { VerifyTab } from "@/components/tabs/VerifyTab";

type TabType = "stake" | "verify" | "delegate" | "undelegate" | "withdraw";

// Main content component that uses the staking service
function StakingContent({
  selectedToken,
  bootstrapStatus,
  tokenText,
}: {
  selectedToken: Token;
  bootstrapStatus: BootstrapStatus;
  tokenText?: string;
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
  const isWalletConnected = walletConnector.isReady;

  // Determine available tabs based on bootstrap status and connector type
  const availableTabs = useMemo(() => {
    const isBootstrapped = bootstrapStatus?.isBootstrapped || false;
    const requiresExtraConnect =
      selectedToken.connector?.requireExtraConnectToImua || false;

    // Check if this is an NST token
    const isNSTToken = selectedToken.type === "nst";
    // Default tabs for all scenarios
    const tabs = [{ id: "stake", label: "Stake" }];

    // For NST tokens, add verify tab after stake
    if (isNSTToken) {
      tabs.push({ id: "verify", label: "Verify" });
    }

    // Only add other tabs if bootstrapped or if the connector doesn't require extra connection
    if (isBootstrapped || !requiresExtraConnect) {
      tabs.push(
        { id: "delegate", label: "Delegate" },
        { id: "undelegate", label: "Undelegate" },
        { id: "withdraw", label: "Withdraw" },
      );
    }

    // However, withdraw should only be added for NST tokens if bootstrapped
    if (isNSTToken && !isBootstrapped) {
      tabs.pop();
    }

    return tabs;
  }, [bootstrapStatus, selectedToken.connector, selectedToken.type]);

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
              {tokenText || selectedToken.symbol} assets
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

    // Determine source and destination chains based on bootstrap status
    const isBootstrapped = bootstrapStatus?.isBootstrapped || false;

    switch (currentTab) {
      case "stake":
        // For NST tokens, use the specialized NST staking tab
        if (selectedToken.type === "nst") {
          return (
            <StakeNSTTab
              sourceChain={selectedToken.network.chainName.toLowerCase()}
              destinationChain={selectedToken.network.chainName.toLowerCase()}
            />
          );
        }
        // For other tokens, use the regular stake tab
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
      case "verify":
        return (
          <VerifyTab
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
        <div className="flex justify-center border-b border-[#222233] overflow-x-auto scrollbar-hide">
          <div className="flex min-w-0">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                className={`py-4 px-6 text-base font-medium relative whitespace-nowrap flex-shrink-0 ${
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
                      tokenText={selectedToken.symbol.includes("nst") ? "ETH" : undefined}
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
