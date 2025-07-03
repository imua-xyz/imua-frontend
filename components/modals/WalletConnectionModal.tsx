// components/new-staking/modals/WalletConnectionModal.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSwitchChain, useConnect } from "wagmi";
import { imua } from "@/config/wagmi";
import { Button } from "@/components/ui/button";
import { Token } from "@/types/tokens";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { EVMNetwork } from "@/types/networks";
import { useWalletConnectorContext } from "@/contexts/WalletConnectorContext";

interface WalletConnectionModalProps {
  token: Token;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function WalletConnectionModal({
  token,
  isOpen,
  onClose,
  onSuccess,
}: WalletConnectionModalProps) {
  const [connecting, setConnecting] = useState(false);
  const walletConnector = useWalletConnectorContext();
  const { address, chain, isConnected: isEVMWalletConnected } = useAccount();
  const { switchChain, status: switchChainStatus } = useSwitchChain();

  // Extract connection status from wallet connector
  const { isReady, issues, boundAddress } = walletConnector;

  // Extract connector information from token
  const targetEVMChainID =
    (token.network as EVMNetwork).evmChainID || undefined;
  const { evmCompatible, requireExtraConnectToImua, customConnector } =
    token.connector;

  // Check if connected to Imua network when required
  const isImuaNetwork = chain?.id === imua.id;

  // Handle native wallet connection
  const handleNativeConnect = async () => {
    setConnecting(true);
    try {
      if (evmCompatible) {
        // For EVM-compatible tokens, connection is handled by ConnectButton
        // This is just a placeholder
      } else if (walletConnector.connectNative) {
        // For non-EVM tokens with custom connector
        await walletConnector.connectNative();
      }
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setConnecting(false);
    }
  };

  // Handle native wallet disconnection
  const handleNativeDisconnect = async () => {
    try {
      if (!evmCompatible && walletConnector.disconnectNative) {
        await walletConnector.disconnectNative();
      }
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  };

  // Check if all connection requirements are met and call onSuccess
  useEffect(() => {
    if (isReady) {
      onSuccess();
    }
  }, [isReady, onSuccess]);

  // Check if custom connector is installed
  const [isCustomConnectorInstalled, setIsCustomConnectorInstalled] =
    useState(false);

  useEffect(() => {
    const checkCustomConnectorInstallation = async () => {
      if (walletConnector.checkNativeInstallation) {
        const installed = await walletConnector.checkNativeInstallation();
        setIsCustomConnectorInstalled(installed);
      }
    };

    if (!evmCompatible && walletConnector.checkNativeInstallation) {
      checkCustomConnectorInstallation();
    }
  }, [walletConnector, evmCompatible]);

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
                ? "Connect Required Wallets"
                : `Connect ${token.network.chainName} Wallet`}
            </h2>

            {/* Progress indicator for connections that require multiple wallets */}
            {requireExtraConnectToImua && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">
                    Connection Progress
                  </span>
                  <span className="text-sm text-[#9999aa]">
                    {isReady
                      ? "Complete"
                      : `${
                          (!issues?.needsConnectToNative ? 1 : 0) +
                          (!issues?.needsConnectToImua &&
                          !issues?.needsMatchingBoundAddress
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
                        (!issues?.needsConnectToNative ? 50 : 0) +
                        (!issues?.needsConnectToImua &&
                        !issues?.needsMatchingBoundAddress
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
                !issues?.needsConnectToNative
                  ? "border-green-500/30 bg-green-950/10"
                  : "border-[rgba(255,255,255,0.1)]"
              } rounded-lg mb-4`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <img
                    src={token.iconUrl}
                    alt={token.symbol}
                    className="w-4 h-4"
                  />
                  {token.network.chainName} Wallet
                </h3>

                {!issues?.needsConnectToNative && (
                  <div className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                    Connected
                  </div>
                )}
              </div>

              {evmCompatible ? (
                // For EVM-compatible tokens, provide context-specific guidance
                <div>
                  <div className="flex justify-center">
                    <ConnectButton chainStatus="icon" accountStatus="address" />
                  </div>

                  {issues?.needsConnectToNative && (
                    <div className="mt-3 text-center">
                      {!isEVMWalletConnected ? (
                        <div className="flex items-center justify-center gap-2 text-[#9999aa] text-sm">
                          <AlertCircle size={16} className="text-amber-400" />
                          <p>Please connect your wallet to continue</p>
                        </div>
                      ) : chain?.id !== targetEVMChainID ? (
                        <div className="flex items-center justify-center gap-2 text-[#9999aa] text-sm">
                          <AlertCircle size={16} className="text-amber-400" />
                          <p>
                            Please switch to{" "}
                            <span className="text-[#00e5ff] font-medium">
                              {token.network.chainName}
                            </span>
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : customConnector ? (
                // For non-EVM tokens with custom connector
                !isCustomConnectorInstalled ? (
                  <div className="text-center">
                    <p className="mb-2 text-[#9999aa] text-sm">
                      {customConnector.name} extension is required for{" "}
                      {token.symbol} staking
                    </p>
                    <div className="flex justify-center">
                      <Button
                        onClick={() =>
                          window.open(token.connector.installUrl, "_blank")
                        }
                        className="bg-[#00e5ff] text-black hover:bg-[#00c8df] flex items-center gap-2"
                      >
                        Install {customConnector.name}{" "}
                        <ExternalLink size={16} />
                      </Button>
                    </div>
                  </div>
                ) : issues?.needsConnectToNative ? (
                  <div className="text-center">
                    <p className="mb-2 text-[#9999aa] text-sm">
                      Connect your {customConnector.name} for {token.symbol}
                    </p>
                    <Button
                      onClick={handleNativeConnect}
                      disabled={connecting}
                      className="bg-[#00e5ff] text-black hover:bg-[#00c8df]"
                    >
                      {connecting
                        ? "Connecting..."
                        : `Connect ${customConnector.name}`}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <CheckCircle size={16} />
                    <span className="text-sm">
                      Connected to {token.name} Network
                    </span>
                  </div>
                )
              ) : (
                <div className="text-center text-[#9999aa]">
                  No wallet connector available for this token
                </div>
              )}
            </div>

            {/* Imua Network Connection Section (only if required) */}
            {requireExtraConnectToImua && (
              <div
                className={`p-4 border ${
                  !issues?.needsConnectToImua &&
                  !issues?.needsMatchingBoundAddress
                    ? "border-green-500/30 bg-green-950/10"
                    : "border-[rgba(255,255,255,0.1)]"
                } rounded-lg mb-4`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <img src="/imua-logo.avif" alt="Imua" className="w-4 h-4" />
                    Imua Chain Wallet
                  </h3>

                  {isEVMWalletConnected && (
                    <div
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isImuaNetwork && !issues?.needsMatchingBoundAddress
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {isImuaNetwork
                        ? issues?.needsMatchingBoundAddress
                          ? "Wrong Address"
                          : "Connected"
                        : "Wrong Network"}
                    </div>
                  )}
                </div>

                {!isEVMWalletConnected ? (
                  <div className="flex justify-center">
                    <ConnectButton chainStatus="icon" accountStatus="address" />
                  </div>
                ) : issues?.needsMatchingBoundAddress && boundAddress ? (
                  <div className="text-center">
                    <p className="mb-2 text-rose-500 text-sm">
                      This {token.symbol} address is already bound to a
                      different Imua address. Please connect:
                    </p>
                    <div className="p-2 bg-[#21212f] rounded-md mb-3 break-all text-xs text-[#9999aa]">
                      {boundAddress}
                    </div>
                    <ConnectButton chainStatus="icon" accountStatus="address" />
                  </div>
                ) : !isImuaNetwork ? (
                  <div className="text-center">
                    <p className="mb-2 text-[#9999aa] text-sm">
                      Please switch to the Imua network
                    </p>
                    {switchChain ? (
                      <Button
                        onClick={() => switchChain({ chainId: imua.id })}
                        disabled={switchChainStatus === "pending"}
                        className="bg-[#00e5ff] text-black hover:bg-[#00c8df]"
                      >
                        {switchChainStatus === "pending"
                          ? "Switching..."
                          : "Switch to Imua Network"}
                      </Button>
                    ) : (
                      <p className="text-[#9999aa] text-sm">
                        Please manually switch to the Imua network in your
                        wallet
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <CheckCircle size={16} />
                    <span className="text-sm">Connected to Imua Network</span>
                  </div>
                )}
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
              <div className="mt-4 p-3 border border-[rgba(255,255,255,0.1)] rounded-lg bg-[#1a1a24]">
                <h4 className="font-medium text-white flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-[#9999aa]" />
                  Why two wallets?
                </h4>
                <p className="text-xs text-[#9999aa]">
                  {token.symbol} staking requires both wallets: {token.symbol}{" "}
                  Wallet for deposits and Ethereum Wallet on Imua Network for
                  delegation and withdrawals.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
