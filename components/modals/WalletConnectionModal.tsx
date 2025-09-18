// components/new-staking/modals/WalletConnectionModal.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { useSwitchChain } from "wagmi";
import { ActionButton } from "@/components/ui/action-button";
import { Token } from "@/types/tokens";
import { useWalletConnectorContext } from "@/contexts/WalletConnectorContext";
import { useBootstrapStatus } from "@/hooks/useBootstrapStatus";
import { IssueWithResolver } from "@/types/wallet-connector";
import Image from "next/image";

interface WalletConnectionModalProps {
  token: Token;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onReopen?: () => void;
}

export function WalletConnectionModal({
  token,
  isOpen,
  onClose,
  onSuccess,
  onReopen,
}: WalletConnectionModalProps) {
  const [connecting, setConnecting] = useState(false);
  const walletConnector = useWalletConnectorContext();
  const { status: switchChainStatus } = useSwitchChain();
  const { bootstrapStatus } = useBootstrapStatus();

  // Extract connection status from wallet connector
  const {
    isReadyForStaking,
    issues,
    nativeWallet,
    bindingEVMWallet,
    bindingState,
  } = walletConnector;

  // Extract connector information from token
  const { evmCompatible, requireExtraConnectToImua, customConnector } =
    token.network.connector;

  // Determine if we're in bootstrap phase
  const isBootstrapPhase = !bootstrapStatus?.isBootstrapped;

  // Check if all connection requirements are met and call onSuccess
  useEffect(() => {
    if (isReadyForStaking) {
      onSuccess();
    }
  }, [isReadyForStaking, onSuccess]);

  // Handle issue resolution
  const handleIssueResolve = async (issue: IssueWithResolver) => {
    if (!issue.resolve) return;

    setConnecting(true);
    try {
      // For Bitcoin connections, close modal first to avoid hiding AppKit modal
      if (
        token.network.chainName === "Bitcoin" ||
        token.network.chainName === "Bitcoin Testnet"
      ) {
        onClose();
        // Small delay to ensure modal closes before AppKit opens
        setTimeout(async () => {
          try {
            await issue.resolve!();
            // AppKit modal closed - always reopen our modal to show updated status
            onReopen?.();
          } catch (error) {
            console.error("Issue resolution failed:", error);
            // AppKit modal closed - always reopen our modal so user can see status
            onReopen?.();
          }
        }, 100);

        // Fallback timeout to ensure modal reopens even if AppKit events don't fire
        setTimeout(() => {
          onReopen?.();
        }, 35000); // 35 second timeout (longer than AppKit's 30s timeout)
      } else {
        // For other connections, resolve directly
        await issue.resolve!();
      }
    } catch (error) {
      console.error("Issue resolution failed:", error);
    } finally {
      setConnecting(false);
    }
  };

  // Helper function to render manual action notice
  const renderManualActionNotice = (
    message: string,
    color: "amber" | "rose" = "amber",
    showHeader: boolean = true,
  ) => {
    const colorClasses =
      color === "amber"
        ? "border-amber-500/30 bg-amber-950/10 text-amber-400"
        : "border-rose-500/30 bg-rose-950/10 text-rose-400";

    return (
      <div className={`p-3 border ${colorClasses} rounded-lg`}>
        {showHeader && (
          <div className="flex items-center justify-center gap-2 text-sm mb-2">
            <AlertCircle size={16} />
            <span className="font-medium">Manual Action Required</span>
          </div>
        )}
        <p className="text-xs opacity-90">{message}</p>
      </div>
    );
  };

  // Helper function to render action button
  const renderActionButton = (
    onClick: () => void,
    text: string,
    loadingText?: string,
    disabled?: boolean,
  ) => (
    <ActionButton
      onClick={onClick}
      disabled={disabled}
      loading={connecting}
      loadingText={loadingText}
      variant="primary"
      size="md"
    >
      {text}
    </ActionButton>
  );

  // Helper function to render native wallet section
  const renderNativeWalletSection = () => {
    if (evmCompatible) {
      return renderEVMTokenSection();
    }

    if (customConnector) {
      return renderCustomConnectorSection();
    }

    return (
      <div className="text-center text-[#9999aa]">
        No wallet connector available for this token
      </div>
    );
  };

  // Helper function to render EVM token section
  const renderEVMTokenSection = () => {
    // Show custom buttons that use our resolvers consistently
    return (
      <div className="text-center">
        {issues?.needsConnectNative && (
          <div className="mb-4">
            <p className="mb-3 text-[#9999aa] text-sm">
              Connect your wallet to continue
            </p>
            {issues.needsConnectNative.resolve
              ? renderActionButton(
                  () => handleIssueResolve(issues.needsConnectNative!),
                  "Connect Wallet",
                  "Connecting...",
                )
              : renderManualActionNotice(
                  "Please manually connect your wallet.",
                )}
          </div>
        )}

        {issues?.needsSwitchNative && (
          <div className="mb-4">
            <p className="mb-3 text-[#9999aa] text-sm">
              Wrong network detected
            </p>
            {issues.needsSwitchNative.resolve ? (
              <div className="space-y-3">
                <p className="text-xs text-[#9999aa]">
                  Click to switch to {token.network.chainName} network
                </p>
                {renderActionButton(
                  () => handleIssueResolve(issues.needsSwitchNative!),
                  "Switch Network",
                  "Switching...",
                  switchChainStatus === "pending",
                )}
              </div>
            ) : (
              renderManualActionNotice(
                "Please switch to the correct network in your wallet.",
                "amber",
                false,
              )
            )}
          </div>
        )}

        {/* Connected state - show when no issues */}
        {!issues?.needsConnectNative && !issues?.needsSwitchNative && (
          <div className="flex items-center justify-center gap-2 text-green-400">
            <CheckCircle size={16} />
            <span className="text-sm">
              Connected to {token.network.chainName}
            </span>
            {nativeWallet.address && (
              <div className="text-xs text-[#9999aa] mt-1">
                {nativeWallet.address.slice(0, 8)}...
                {nativeWallet.address.slice(-8)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper function to render custom connector section
  const renderCustomConnectorSection = () => {
    if (!customConnector) {
      return (
        <div className="text-center text-[#9999aa]">
          No wallet connector available for this token
        </div>
      );
    }

    if (issues?.needsInstallNative) {
      return (
        <div className="text-center">
          <p className="mb-2 text-[#9999aa] text-sm">
            {customConnector.name} is required for {token.symbol} staking
          </p>
          <div className="flex justify-center">
            <ActionButton
              onClick={() =>
                window.open(token.network.connector.installUrl, "_blank")
              }
              variant="primary"
              size="sm"
              className="flex items-center gap-2"
            >
              Install {customConnector.name} <ExternalLink size={16} />
            </ActionButton>
          </div>
        </div>
      );
    }

    if (issues?.needsConnectNative) {
      return (
        <div className="text-center">
          <p className="mb-2 text-[#9999aa] text-sm">
            Connect your {customConnector.name} for {token.symbol}
          </p>
          {issues.needsConnectNative.resolve
            ? renderActionButton(
                () => handleIssueResolve(issues.needsConnectNative!),
                `Connect ${customConnector.name}`,
                "Connecting...",
              )
            : renderManualActionNotice(
                `Please manually connect your ${customConnector.name} wallet.`,
              )}
        </div>
      );
    }

    if (issues?.needsSwitchNative) {
      return (
        <div className="text-center">
          <p className="mb-3 text-[#9999aa] text-sm">Wrong network detected</p>
          {issues.needsSwitchNative.resolve ? (
            <div className="space-y-3">
              <p className="text-xs text-[#9999aa]">
                Switch network in your wallet, then reconnect
              </p>
              {renderActionButton(
                () => handleIssueResolve(issues.needsSwitchNative!),
                "Disconnect & Reconnect",
                "Disconnecting...",
              )}
            </div>
          ) : (
            renderManualActionNotice(
              "Switch to the correct network in your wallet, then reconnect.",
              "amber",
              false,
            )
          )}
        </div>
      );
    }

    // Connected state
    return (
      <div className="flex items-center justify-center gap-2 text-green-400">
        <CheckCircle size={16} />
        <span className="text-sm">Connected to {token.network.chainName}</span>
        {nativeWallet.address && (
          <div className="text-xs text-[#9999aa] mt-1">
            {nativeWallet.address.slice(0, 8)}...
            {nativeWallet.address.slice(-8)}
          </div>
        )}
      </div>
    );
  };

  // Helper function to render EVM wallet section
  const renderEVMWalletSection = () => {
    if (issues?.needsConnectBindingEVM) {
      return (
        <div className="text-center">
          <p className="mb-2 text-[#9999aa] text-sm">
            Connect your EVM wallet for {token.symbol} staking
          </p>
          {issues.needsConnectBindingEVM.resolve
            ? renderActionButton(
                () => handleIssueResolve(issues.needsConnectBindingEVM!),
                "Connect EVM Wallet",
              )
            : renderManualActionNotice(
                "Please manually connect your EVM wallet.",
              )}
        </div>
      );
    }

    if (issues?.needsSwitchBindingEVM) {
      return (
        <div className="text-center">
          <p className="mb-2 text-[#9999aa] text-sm">
            Switch to the correct EVM network
          </p>
          {issues.needsSwitchBindingEVM.resolve
            ? renderActionButton(
                () => handleIssueResolve(issues.needsSwitchBindingEVM!),
                "Switch Network",
                "Switching...",
                switchChainStatus === "pending",
              )
            : renderManualActionNotice(
                "Please manually switch to the correct EVM network in your wallet.",
              )}
        </div>
      );
    }

    if (issues?.needsMatchingAddress && bindingState?.expectedBoundAddress) {
      return (
        <div className="text-center">
          <p className="mb-2 text-rose-500 text-sm">
            This {token.symbol} address is already bound to a different EVM
            address. Please connect:
          </p>
          <div className="p-2 bg-[#21212f] rounded-md mb-3 break-all text-xs text-[#9999aa]">
            {bindingState.expectedBoundAddress}
          </div>
          {issues.needsMatchingAddress.resolve
            ? renderActionButton(
                () => handleIssueResolve(issues.needsMatchingAddress!),
                "Connect Correct EVM Wallet",
              )
            : renderManualActionNotice(
                "Please switch to the correct wallet address in your EVM wallet extension or mobile app, then reconnect.",
                "rose",
              )}
        </div>
      );
    }

    // Connected state
    return (
      <div className="flex items-center justify-center gap-2 text-green-400">
        <CheckCircle size={16} />
        <span className="text-sm">Connected to EVM Network</span>
        {bindingEVMWallet?.address && (
          <div className="text-xs text-[#9999aa] mt-1">
            {bindingEVMWallet.address.slice(0, 8)}...
            {bindingEVMWallet.address.slice(-8)}
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-[#15151c] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 w-full max-w-md relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#9999aa] hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-4 text-white">
              {requireExtraConnectToImua
                ? isBootstrapPhase
                  ? "Connect Required Wallets (Bootstrap Phase)"
                  : "Connect Required Wallets"
                : `Connect ${token.network.chainName} Wallet`}
            </h2>

            {/* Progress indicator for connections that require multiple wallets */}
            {requireExtraConnectToImua && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">
                    {isBootstrapPhase
                      ? "Bootstrap Phase Progress"
                      : "Connection Progress"}
                  </span>
                  <span className="text-sm text-[#9999aa]">
                    {isReadyForStaking
                      ? "Complete"
                      : `${
                          (!issues?.needsConnectNative ? 1 : 0) +
                          (!issues?.needsConnectBindingEVM &&
                          !issues?.needsMatchingAddress
                            ? 1
                            : 0)
                        }/2`}
                  </span>
                </div>
                <div className="h-2 w-full bg-[#21212f] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00e5ff] transition-all duration-500 ease-in-out"
                    style={{
                      width: `${
                        (!issues?.needsConnectNative ? 50 : 0) +
                        (!issues?.needsConnectBindingEVM &&
                        !issues?.needsMatchingAddress
                          ? 50
                          : 0)
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            )}

            {/* Native Wallet Connection Section */}
            <div
              className={`p-4 border ${
                !issues?.needsConnectNative
                  ? "border-green-500/30 bg-green-950/10"
                  : "border-[rgba(255,255,255,0.1)]"
              } rounded-lg mb-4`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <Image
                    src={token.iconUrl}
                    alt={token.symbol}
                    className="w-4 h-4"
                    width={16}
                    height={16}
                  />
                  {token.network.chainName} Wallet
                </h3>

                {!issues?.needsConnectNative && (
                  <div className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                    Connected
                  </div>
                )}
              </div>

              {renderNativeWalletSection()}
            </div>

            {/* EVM Network Connection Section (only if required) */}
            {requireExtraConnectToImua && (
              <div
                className={`p-4 border ${
                  !issues?.needsConnectBindingEVM &&
                  !issues?.needsMatchingAddress
                    ? "border-green-500/30 bg-green-950/10"
                    : "border-[rgba(255,255,255,0.1)]"
                } rounded-lg mb-4`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <Image
                      src="/imua-logo.avif"
                      alt="EVM Wallet"
                      className="w-4 h-4"
                      width={16}
                      height={16}
                    />
                    EVM Wallet
                  </h3>

                  {bindingEVMWallet?.connected && (
                    <div
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        !issues?.needsMatchingAddress
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {issues?.needsMatchingAddress
                        ? "Wrong Address"
                        : "Connected"}
                    </div>
                  )}
                </div>

                {renderEVMWalletSection()}
              </div>
            )}

            {/* Other issues */}
            {issues?.others && issues.others.length > 0 && (
              <div className="p-4 border border-yellow-500/30 bg-yellow-950/10 rounded-lg mb-4">
                <div className="flex items-start">
                  <AlertCircle
                    size={18}
                    className="text-yellow-500 mr-2 mt-0.5"
                  />
                  <div>
                    <h4 className="text-sm font-medium text-white mb-1">
                      Additional Issues
                    </h4>
                    <ul className="text-xs text-[#9999aa] list-disc pl-4">
                      {issues.others.map((issue, index) => (
                        <li key={`issue-${index}`}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Connection explanation for multi-wallet scenarios */}
            {requireExtraConnectToImua && (
              <div className="mt-4 space-y-3">
                <div className="p-3 border border-[rgba(255,255,255,0.1)] rounded-lg bg-[#1a1a24]">
                  <h4 className="font-medium text-white flex items-center gap-2 mb-2">
                    <AlertCircle size={16} className="text-[#9999aa]" />
                    {isBootstrapPhase
                      ? "Why two wallets during bootstrap?"
                      : "Why two wallets?"}
                  </h4>
                  <p className="text-xs text-[#9999aa]">
                    {isBootstrapPhase
                      ? `${token.symbol} staking requires both wallets: ${token.symbol} Wallet for deposits and EVM Wallet on Bootstrap Network to specify your bound address in transaction memo.`
                      : `${token.symbol} staking requires both wallets: ${token.symbol} Wallet for deposits and EVM Wallet on Imua Network for delegation and withdrawals.`}
                  </p>
                </div>

                {/* Special emphasis for bootstrap phase future Imuachain connection */}
                {isBootstrapPhase && requireExtraConnectToImua && (
                  <div className="space-y-3">
                    <div className="p-3 border border-[#00e5ff]/30 rounded-lg bg-gradient-to-r from-[#00e5ff]/5 to-[#00c8df]/5">
                      <h4 className="font-medium text-[#00e5ff] flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-[#00e5ff] flex items-center justify-center">
                          <span className="text-black text-xs font-bold">
                            !
                          </span>
                        </div>
                        Important: Future Imuachain Connection
                      </h4>
                      <p className="text-xs text-[#00e5ff]/90">
                        <span className="font-medium text-[#00e5ff]">
                          This exact same EVM wallet
                        </span>{" "}
                        will be permanently bound to your {token.symbol} address
                        and{" "}
                        <span className="font-medium text-[#00e5ff]">
                          must be used to connect to Imuachain
                        </span>{" "}
                        for all future delegation, undelegation, and withdrawal
                        operations.
                      </p>
                    </div>

                    {/* EOA wallet requirement warning for bootstrap phase */}
                    <div className="p-3 border border-amber-500/30 rounded-lg bg-gradient-to-r from-amber-500/5 to-orange-500/5">
                      <h4 className="font-medium text-amber-400 flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                          <span className="text-black text-xs font-bold">
                            ⚠
                          </span>
                        </div>
                        EOA Wallet Required
                      </h4>
                      <p className="text-xs text-amber-400/90">
                        <span className="font-medium text-amber-400">
                          Only EOA wallets are supported for binding during
                          bootstrap.
                        </span>{" "}
                        Contract wallets (multisig, account abstraction) may not
                        be controlled by you in future Imuachain and we cannot
                        verify your authorization during bootstrap phase. Please
                        use a standard wallet like MetaMask, Coinbase Wallet, or
                        similar.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
