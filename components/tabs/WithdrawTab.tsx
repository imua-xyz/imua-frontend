// components/new-staking/tabs/WithdrawTab.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAmountInput } from "@/hooks/useAmountInput";
import { Phase, PhaseStatus } from "@/types/staking";
import { formatUnits } from "viem";
import { ArrowRight, Unlock, Wallet } from "lucide-react";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import {
  OperationProgress,
  OperationStep,
  transactionStep,
  confirmationStep,
  sendingRequestStep,
  receivingResponseStep,
  completionStep,
} from "@/components/ui/operation-progress";
import Image from "next/image";

// Utility function to format amounts with fixed decimal places for DISPLAY ONLY
// Use this for UI elements that don't require precise values (badges, status messages)
// For functional elements (placeholders, MAX buttons), use formatUnits() for accuracy
const formatAmountForDisplay = (amount: bigint, decimals: number): string => {
  const fullAmount = formatUnits(amount, decimals);
  const num = parseFloat(fullAmount);

  // Smart decimal formatting based on amount size
  if (num < 0.0001) return num.toFixed(6); // Very small: 6 decimals
  if (num < 0.01) return num.toFixed(5); // Small: 5 decimals
  if (num < 1) return num.toFixed(4); // Medium: 4 decimals
  if (num < 100) return num.toFixed(3); // Large: 3 decimals
  return num.toFixed(2); // Very large: 2 decimals
};

interface WithdrawTabProps {
  sourceChain: string;
  destinationChain: string;
  onSuccess?: () => void;
}

export function WithdrawTab({
  sourceChain,
  destinationChain,
  onSuccess,
}: WithdrawTabProps) {
  const stakingService = useStakingServiceContext();
  const token = stakingService.token;

  const decimals = stakingService.walletBalance?.decimals || 0;
  const maxClaimAmount = stakingService.stakerBalance?.claimable || BigInt(0);
  const maxWithdrawAmount =
    stakingService.stakerBalance?.withdrawable || BigInt(0);

  const {
    amount: claimAmount,
    parsedAmount: parsedClaimAmount,
    error: claimAmountError,
    setAmount: setClaimAmount,
  } = useAmountInput({
    decimals: decimals,
    maxAmount: maxClaimAmount,
  });

  const {
    amount: withdrawAmount,
    parsedAmount: parsedWithdrawAmount,
    error: withdrawAmountError,
    setAmount: setWithdrawAmount,
  } = useAmountInput({
    decimals: decimals,
    maxAmount: maxWithdrawAmount,
  });

  // State for recipient address
  const [recipientAddress, setRecipientAddress] = useState("");

  // Check if claimPrincipal is available in this stakingProvider
  const canClaimPrincipal = !!stakingService.claimPrincipal;

  // Check if this is a direct withdrawal
  const isDirectWithdrawal = !canClaimPrincipal;

  // Tab state for cleaner UX - Start with appropriate tab based on token type
  const [activeTab, setActiveTab] = useState<"claim" | "withdraw">(
    isDirectWithdrawal ? "withdraw" : "claim",
  );

  // Operation progress state
  const [operationSteps, setOperationSteps] = useState<OperationStep[]>([]);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [activeOperation, setActiveOperation] = useState<
    "claim" | "withdraw" | null
  >(null);

  // Operation progress tracking
  const [showProgress, setShowProgress] = useState(false);

  // Auto-switch tab when token type changes (e.g., switching between EVM and XRP tokens)
  useEffect(() => {
    if (isDirectWithdrawal && activeTab === "claim") {
      setActiveTab("withdraw");
    } else if (
      !isDirectWithdrawal &&
      activeTab === "withdraw" &&
      maxWithdrawAmount === BigInt(0)
    ) {
      setActiveTab("claim");
    }
  }, [isDirectWithdrawal, activeTab, maxWithdrawAmount]);

  // Initialize operation steps based on operation type
  useEffect(() => {
    if (activeOperation === "claim") {
      // Duplex mode: transaction, confirmation, relay, response, completion
      const steps: OperationStep[] = [
        { ...transactionStep, description: "Sending claim transaction" },
        { ...confirmationStep },
        {
          ...sendingRequestStep,
          description: "Sending claim request to Imuachain",
        },
        {
          ...receivingResponseStep,
          description: "Receiving approval from Imuachain",
        },
        { ...completionStep, description: "Claim completed" },
      ];
      setOperationSteps(steps);
    } else if (activeOperation === "withdraw") {
      // Local mode: transaction, confirmation, completion
      const steps: OperationStep[] = [
        { ...transactionStep, description: "Sending withdraw transaction" },
        { ...confirmationStep },
        { ...completionStep, description: "Withdrawal completed" },
      ];
      setOperationSteps(steps);
    }
  }, [activeOperation]);

  // Handle phase changes from txUtils
  const handlePhaseChange = (newPhase: Phase) => {
    setOperationSteps((prev) => {
      const updatedSteps = [...prev];

      // Find the target index for the new phase
      const targetIndex = updatedSteps.findIndex(
        (step) => step.phase === newPhase,
      );
      if (targetIndex >= 0) {
        // Mark the new step as processing
        updatedSteps[targetIndex].status = "processing";

        // Update transaction hash for transaction step
        if (newPhase === "sendingTx" && txHash) {
          updatedSteps[targetIndex].txHash = txHash;
          updatedSteps[targetIndex].explorerUrl = token.network.txExplorerUrl;
        }

        // Mark all previous steps as success
        for (let i = 0; i < targetIndex; i++) {
          updatedSteps[i].status = "success";
        }
      }

      return updatedSteps;
    });
  };

  // Handle claim operation
  const handleClaimOperation = async () => {
    if (!canClaimPrincipal) return;

    setActiveOperation("claim");
    setShowProgress(true);

    try {
      const result = await stakingService.claimPrincipal!(parsedClaimAmount, {
        onPhaseChange: handlePhaseChange,
      });

      if (result.hash) {
        setTxHash(result.hash);
      }

      if (result.success) {
        // Mark final step as success
        setOperationSteps((prev) => {
          const updated = [...prev];
          if (updated[updated.length - 1]) {
            updated[updated.length - 1].status = "success";
          }
          return updated;
        });

        // Auto-switch to withdraw tab after successful claim
        if (maxWithdrawAmount > BigInt(0) || parsedClaimAmount) {
          setActiveTab("withdraw");
        }
        if (onSuccess) onSuccess();
      } else {
        // Mark current step as error
        setOperationSteps((prev) => {
          const updated = [...prev];
          const processingStepIndex = updated.findIndex(
            (step) => step.status === "processing",
          );
          if (processingStepIndex >= 0) {
            updated[processingStepIndex].status = "error";
            updated[processingStepIndex].errorMessage =
              result.error || "Claim failed";
          }
          return updated;
        });
      }
    } catch (error) {
      console.error("Operation failed:", error);
      // Mark current step as error
      setOperationSteps((prev) => {
        const updated = [...prev];
        const processingStepIndex = updated.findIndex(
          (step) => step.status === "processing",
        );
        if (processingStepIndex >= 0) {
          updated[processingStepIndex].status = "error";
          updated[processingStepIndex].errorMessage =
            error instanceof Error ? error.message : "Claim failed";
        }
        return updated;
      });
    }
  };

  // Handle withdraw operation
  const handleWithdrawOperation = async () => {
    setActiveOperation("withdraw");
    setShowProgress(true);

    try {
      const result = await stakingService.withdrawPrincipal!(
        parsedWithdrawAmount,
        (recipientAddress as `0x${string}`) ||
          stakingService.walletBalance?.stakerAddress,
        {
          onPhaseChange: handlePhaseChange,
        },
      );

      if (result.hash) {
        setTxHash(result.hash);
      }

      if (result.success) {
        // Mark final step as success
        setOperationSteps((prev) => {
          const updated = [...prev];
          if (updated[updated.length - 1]) {
            updated[updated.length - 1].status = "success";
          }
          return updated;
        });

        if (onSuccess) onSuccess();
      } else {
        // Mark current step as error
        setOperationSteps((prev) => {
          const updated = [...prev];
          const processingStepIndex = updated.findIndex(
            (step) => step.status === "processing",
          );
          if (processingStepIndex >= 0) {
            updated[processingStepIndex].status = "error";
            updated[processingStepIndex].errorMessage =
              result.error || "Withdrawal failed";
          }
          return updated;
        });
      }
    } catch (error) {
      console.error("Operation failed:", error);
      // Mark current step as error
      setOperationSteps((prev) => {
        const updated = [...prev];
        const processingStepIndex = updated.findIndex(
          (step) => step.status === "processing",
        );
        if (processingStepIndex >= 0) {
          updated[processingStepIndex].status = "error";
          updated[processingStepIndex].errorMessage =
            error instanceof Error ? error.message : "Withdrawal failed";
        }
        return updated;
      });
    }
  };

  // Handle modal close - only reset on success
  const handleModalClose = () => {
    // Check if operation completed successfully by checking final step status
    const isSuccess =
      operationSteps.length > 0 &&
      operationSteps[operationSteps.length - 1]?.status === "success";

    if (isSuccess) {
      // Reset to initial state
      setClaimAmount("");
      setWithdrawAmount("");
      setRecipientAddress("");
      setActiveOperation(null);
      // Reset steps back to pending (not empty)
      setOperationSteps((prev) =>
        prev.map((step) => ({ ...step, status: "pending" })),
      );
      setTxHash(undefined);
    }

    // Always close modal
    setShowProgress(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Token Info */}
      <div className="flex items-center">
        <div className="relative w-16 h-16 mr-3">
          <Image
            src={token.iconUrl}
            alt={token.symbol}
            fill
            sizes="(max-width: 768px) 64px, 96px"
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">
            Withdraw {token.symbol}
          </h2>
        </div>
      </div>

      {/* Clean Tab Navigation - Handle XRP tokens differently */}
      {!isDirectWithdrawal ? (
        <div className="flex space-x-1 p-1 bg-[#15151c] rounded-lg border border-[#333344]">
          <button
            onClick={() => setActiveTab("claim")}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === "claim"
                ? "bg-[#00e5ff] text-black shadow-lg"
                : "text-[#9999aa] hover:text-white hover:bg-[#222233]"
            }`}
          >
            <Unlock size={16} />
            <span>Claim</span>
            {canClaimPrincipal && maxClaimAmount > BigInt(0) && (
              <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">
                {formatAmountForDisplay(maxClaimAmount, decimals)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("withdraw")}
            disabled={maxWithdrawAmount === BigInt(0)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === "withdraw"
                ? "bg-[#4ade80] text-black shadow-lg"
                : maxWithdrawAmount > BigInt(0)
                  ? "text-[#9999aa] hover:text-white hover:bg-[#222233]"
                  : "text-[#666677] opacity-50 cursor-not-allowed"
            }`}
          >
            <Wallet size={16} />
            <span>Withdraw</span>
            {maxWithdrawAmount > BigInt(0) && (
              <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">
                {formatAmountForDisplay(maxWithdrawAmount, decimals)}
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="text-center py-3">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#1a1a24] rounded-lg border border-[#333344]">
            <Wallet size={16} className="text-[#4ade80]" />
            <span className="text-white font-medium">Direct Withdrawal</span>
            <span className="text-xs text-[#9999aa]">
              (No claim step needed)
            </span>
          </div>
        </div>
      )}

      {/* Single, Elegant Process Explanation */}
      <div className="text-center py-3">
        {!isDirectWithdrawal ? (
          <>
            <p className="text-sm text-[#9999aa]">
              Claim tokens to unlock them, then withdraw to your wallet
            </p>
            {activeTab === "claim" && maxWithdrawAmount > BigInt(0) && (
              <div className="flex items-center justify-center space-x-2 text-xs mt-2">
                <div className="w-2 h-2 rounded-full bg-[#4ade80]"></div>
                <span className="text-[#4ade80]">
                  You already have{" "}
                  {formatAmountForDisplay(maxWithdrawAmount, decimals)}{" "}
                  {token.symbol} unlocked
                </span>
              </div>
            )}
            {activeTab === "withdraw" && maxWithdrawAmount === BigInt(0) && (
              <div className="mt-2">
                <p className="text-xs text-[#666677] mb-2">
                  No tokens unlocked yet
                </p>
                <Button
                  onClick={() => setActiveTab("claim")}
                  variant="outline"
                  size="sm"
                  className="border-[#333344] text-[#00e5ff] hover:bg-[#222233]"
                >
                  Go to Claim
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-[#9999aa]">
            Direct withdrawal from Imuachain to your wallet (no claim step
            needed)
          </p>
        )}
      </div>

      {/* Tab Content - Handle XRP tokens differently */}
      {!isDirectWithdrawal &&
        activeTab === "claim" &&
        canClaimPrincipal &&
        maxClaimAmount > BigInt(0) && (
          <div className="p-6 bg-[#1a1a24] rounded-lg border border-[#333344]">
            <div className="space-y-4">
              {/* Simple header */}
              <div className="text-center pb-2">
                <h3 className="text-lg font-medium text-white">Claim Tokens</h3>
              </div>

              {/* Simple flow indicator */}
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#00e5ff] flex items-center justify-center text-black font-medium">
                    {destinationChain.slice(0, 3)}
                  </div>
                  <span className="text-[#9999aa]">
                    From {destinationChain}
                  </span>
                </div>
                <ArrowRight className="text-[#666677]" size={16} />
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#333344] flex items-center justify-center text-white font-medium">
                    {sourceChain.slice(0, 3)}
                  </div>
                  <span className="text-[#9999aa]">To {sourceChain}</span>
                </div>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-white">
                    Amount to claim
                  </label>
                  <button
                    className="text-xs font-medium text-[#00e5ff]"
                    onClick={() =>
                      setClaimAmount(formatUnits(maxClaimAmount, decimals))
                    }
                  >
                    MAX
                  </button>
                </div>

                <Input
                  type="text"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#15151c] border border-[#333344] rounded-md text-white text-lg"
                  placeholder={`Enter amount (max: ${formatUnits(maxClaimAmount, decimals)} ${token.symbol})`}
                />

                {claimAmountError && (
                  <p className="text-sm text-red-500">{claimAmountError}</p>
                )}
              </div>

              <Button
                className="w-full py-3 bg-[#00e5ff] hover:bg-[#00e5ff]/90 text-black font-medium"
                disabled={
                  showProgress ||
                  !!claimAmountError ||
                  !claimAmount ||
                  !parsedClaimAmount ||
                  parsedClaimAmount === BigInt(0)
                }
                onClick={handleClaimOperation}
              >
                {showProgress && activeOperation === "claim"
                  ? "Processing..."
                  : "Claim Tokens"}
              </Button>
            </div>
          </div>
        )}

      {activeTab === "claim" &&
        (!canClaimPrincipal || maxClaimAmount === BigInt(0)) && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-[#666677]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Unlock size={24} className="text-[#666677]" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              No Tokens to Claim
            </h3>
            <p className="text-[#9999aa]">
              {!canClaimPrincipal
                ? "Claim functionality is not available for this token."
                : "You don't have any tokens available to claim."}
            </p>
          </div>
        )}

      {/* Success State for Claim */}
      {!isDirectWithdrawal &&
        activeTab === "claim" &&
        activeOperation === "claim" &&
        operationSteps.length > 0 &&
        operationSteps[operationSteps.length - 1]?.status === "success" && (
          <div className="p-6 bg-[#0a1a0a] rounded-lg border border-[#4ade80]/30">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#4ade80] rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-black text-xl">✓</span>
              </div>
              <h3 className="text-lg font-medium text-[#4ade80] mb-2">
                Tokens Claimed Successfully!
              </h3>
              <p className="text-[#86efac] mb-4">
                Your tokens are now unlocked and available for withdrawal.
              </p>
              <Button
                onClick={() => setActiveTab("withdraw")}
                className="bg-[#4ade80] hover:bg-[#4ade80]/90 text-black font-medium"
              >
                Go to Withdraw
              </Button>
            </div>
          </div>
        )}

      {/* Direct Withdrawal for XRP tokens */}
      {isDirectWithdrawal && (
        <div className="p-6 bg-[#1a1a24] rounded-lg border border-[#333344]">
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center pb-2">
              <h3 className="text-lg font-medium text-white">
                Direct Withdrawal
              </h3>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-white">
                  Amount to withdraw
                </label>
                <button
                  className="text-xs font-medium text-[#00e5ff]"
                  onClick={() =>
                    setWithdrawAmount(formatUnits(maxWithdrawAmount, decimals))
                  }
                >
                  MAX
                </button>
              </div>

              <Input
                type="text"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#15151c] border border-[#333344] rounded-md text-white text-lg"
                placeholder={`Enter amount (max: ${formatUnits(maxWithdrawAmount, decimals)} ${token.symbol})`}
              />

              {withdrawAmountError && (
                <p className="text-sm text-red-500">{withdrawAmountError}</p>
              )}
            </div>

            {/* Recipient address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Recipient Address (optional)
              </label>
              <Input
                placeholder="Enter address or leave blank to use your wallet"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full px-3 py-2 bg-[#15151c] border border-[#333344] rounded-md text-white"
              />
              <p className="text-xs text-[#9999aa]">
                If left blank, tokens will be sent to your connected wallet
              </p>
            </div>

            <Button
              className="w-full py-3 bg-[#00e5ff] hover:bg-[#00e5ff]/90 text-black font-medium"
              disabled={
                showProgress ||
                !!withdrawAmountError ||
                !withdrawAmount ||
                !parsedWithdrawAmount ||
                parsedWithdrawAmount === BigInt(0)
              }
              onClick={handleWithdrawOperation}
            >
              {showProgress && activeOperation === "withdraw"
                ? "Processing..."
                : "Withdraw Tokens"}
            </Button>
          </div>
        </div>
      )}

      {/* Withdraw Tab Content */}
      {!isDirectWithdrawal &&
        activeTab === "withdraw" &&
        maxWithdrawAmount > BigInt(0) && (
          <div className="p-6 bg-[#1a1a24] rounded-lg border border-[#333344]">
            <div className="space-y-4">
              {/* Simple header */}
              <div className="text-center pb-2">
                <h3 className="text-lg font-medium text-white">
                  Withdraw Tokens
                </h3>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-white">
                    Amount to withdraw
                  </label>
                  <button
                    className="text-xs font-medium text-[#00e5ff]"
                    onClick={() =>
                      setWithdrawAmount(
                        formatUnits(maxWithdrawAmount, decimals),
                      )
                    }
                  >
                    MAX
                  </button>
                </div>

                <Input
                  type="text"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#15151c] border border-[#333344] rounded-md text-white text-lg"
                  placeholder={`Enter amount (max: ${formatUnits(maxWithdrawAmount, decimals)} ${token.symbol})`}
                />

                {withdrawAmountError && (
                  <p className="text-sm text-red-500">{withdrawAmountError}</p>
                )}
              </div>

              {/* Recipient address */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Recipient Address (optional)
                </label>
                <Input
                  placeholder="Enter address or leave blank to use your wallet"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-[#15151c] border border-[#333344] rounded-md text-white"
                />
                <p className="text-xs text-[#9999aa]">
                  If left blank, tokens will be sent to your connected wallet
                </p>
              </div>

              <Button
                className="w-full py-3 bg-[#00e5ff] hover:bg-[#00e5ff]/90 text-black font-medium"
                disabled={
                  showProgress ||
                  !!withdrawAmountError ||
                  !withdrawAmount ||
                  !parsedWithdrawAmount ||
                  parsedWithdrawAmount === BigInt(0)
                }
                onClick={handleWithdrawOperation}
              >
                {showProgress && activeOperation === "withdraw"
                  ? "Processing..."
                  : "Withdraw Tokens"}
              </Button>
            </div>
          </div>
        )}

      {!isDirectWithdrawal &&
        activeTab === "withdraw" &&
        maxWithdrawAmount === BigInt(0) && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-[#666677]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet size={24} className="text-[#666677]" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              No Tokens to Withdraw
            </h3>
            <p className="text-[#9999aa] mb-4">
              Claim tokens first to unlock them for withdrawal.
            </p>
            {canClaimPrincipal && maxClaimAmount > BigInt(0) && (
              <Button
                onClick={() => setActiveTab("claim")}
                className="bg-[#00e5ff] hover:bg-[#00e5ff]/90 text-black font-medium"
              >
                Go to Claim
              </Button>
            )}
          </div>
        )}

      {/* Progress overlay - Use OperationProgress directly */}
      {showProgress && operationSteps.length > 0 && (
        <OperationProgress
          progress={{
            operation: activeOperation === "claim" ? "claim" : "withdraw",
            chainInfo: {
              sourceChain:
                activeOperation === "claim" ? destinationChain : sourceChain,
              destinationChain:
                activeOperation === "claim" ? sourceChain : destinationChain,
            },
            steps: operationSteps,
            overallStatus: {
              // Derive current phase from step statuses
              currentPhase: (() => {
                const processingStep = operationSteps.find(
                  (step) => step.status === "processing",
                );
                if (processingStep) return processingStep.phase;

                const lastSuccessStep = operationSteps
                  .filter((step) => step.status === "success")
                  .pop();
                if (lastSuccessStep) return lastSuccessStep.phase;

                return "sendingTx";
              })(),
              currentPhaseStatus: (() => {
                if (operationSteps.some((step) => step.status === "error"))
                  return "error" as PhaseStatus;
                if (operationSteps.every((step) => step.status === "success"))
                  return "success" as PhaseStatus;
                if (operationSteps.some((step) => step.status === "processing"))
                  return "processing" as PhaseStatus;
                return "pending" as PhaseStatus;
              })(),
            },
          }}
          open={showProgress}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
