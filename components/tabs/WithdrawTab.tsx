// components/new-staking/tabs/WithdrawTab.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAmountInput } from "@/hooks/useAmountInput";
import { TxStatus } from "@/types/staking";
import { formatUnits } from "viem";
import { Info, ArrowRight, AlertCircle } from "lucide-react";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { OperationProgress } from "@/components/ui/operation-progress";
import {
  approvalStep,
  transactionStep,
  confirmationStep,
} from "@/components/ui/operation-progress";

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

  // Transaction state
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [activeOperation, setActiveOperation] = useState<
    "claim" | "withdraw" | null
  >(null);

  // Check if claimPrincipal is available in this stakingProvider
  const canClaimPrincipal = !!stakingService.claimPrincipal;

  // Operation progress tracking
  const [showProgress, setShowProgress] = useState(false);
  const [operationProgress, setOperationProgress] = useState<OperationProgress>(
    {
      operation: "withdraw",
      chainInfo: canClaimPrincipal
        ? {
            sourceChain,
            destinationChain,
          }
        : undefined,
      steps: canClaimPrincipal
        ? [approvalStep, transactionStep, confirmationStep]
        : [transactionStep, confirmationStep],
      currentStepIndex: 0,
      overallStatus: null,
    },
  );

  // Handle claim operation
  const handleClaimOperation = async () => {
    if (!canClaimPrincipal) return;

    setActiveOperation("claim");
    setTxError(null);
    setTxStatus("processing");
    setShowProgress(true);

    // Update operation progress
    setOperationProgress({
      operation: "claim",
      chainInfo: {
        sourceChain: destinationChain,
        destinationChain: sourceChain,
      },
      steps: [approvalStep, transactionStep, confirmationStep],
      currentStepIndex: 0,
      overallStatus: null,
    });

    try {
      // Update progress for transaction submission
      setOperationProgress((prev) => ({
        ...prev,
        currentStepIndex: 0,
        steps: prev.steps.map((step, idx) => ({
          ...step,
          status: idx === 0 ? "processing" : "pending",
        })),
        overallStatus: "processing",
      }));

      const result = await stakingService.claimPrincipal!(parsedClaimAmount, {
        onStatus: (status, error) => {
          setTxStatus(status);
          if (error) setTxError(error);

          // Update progress based on transaction status
          setOperationProgress((prev) => {
            const updatedProgress = { ...prev };

            switch (status) {
              case "approving":
                updatedProgress.currentStepIndex = 0;
                updatedProgress.steps[0].status = "processing";
                updatedProgress.overallStatus = "approving";
                break;

              case "processing":
                if (updatedProgress.steps[0].status === "processing") {
                  updatedProgress.steps[0].status = "success";
                }
                updatedProgress.currentStepIndex = 1;
                updatedProgress.steps[1].status = "processing";
                updatedProgress.overallStatus = "processing";
                break;

              case "success":
                updatedProgress.steps[1].status = "success";
                updatedProgress.currentStepIndex = 2;
                updatedProgress.steps[2].status = "success";
                updatedProgress.overallStatus = "success";
                break;

              case "error":
                const processingIndex = updatedProgress.steps.findIndex(
                  (step) => step.status === "processing",
                );

                if (processingIndex >= 0) {
                  updatedProgress.steps[processingIndex].status = "error";
                }
                updatedProgress.overallStatus = "error";
                break;
            }

            return updatedProgress;
          });
        },
      });

      if (result.success) {
        setTxStatus("success");
        if (onSuccess) onSuccess();
      } else {
        setTxStatus("error");
        setTxError(result.error || "Transaction failed");
      }
    } catch (error) {
      console.error("Operation failed:", error);
      setTxStatus("error");
      setTxError(error instanceof Error ? error.message : "Transaction failed");
    }
  };

  // Handle withdraw operation
  const handleWithdrawOperation = async () => {
    setActiveOperation("withdraw");
    setTxError(null);
    setTxStatus("processing");
    setShowProgress(true);

    // Update operation progress
    setOperationProgress({
      operation: "withdraw",
      steps: [transactionStep, confirmationStep],
      currentStepIndex: 0,
      overallStatus: null,
    });

    try {
      // Update progress for transaction submission
      setOperationProgress((prev) => ({
        ...prev,
        currentStepIndex: 0,
        steps: prev.steps.map((step, idx) => ({
          ...step,
          status: idx === 0 ? "processing" : "pending",
        })),
        overallStatus: "processing",
      }));

      const result = await stakingService.withdrawPrincipal!(
        parsedWithdrawAmount,
        (recipientAddress as `0x${string}`) ||
          stakingService.walletBalance?.stakerAddress,
        {
          onStatus: (status, error) => {
            setTxStatus(status);
            if (error) setTxError(error);

            // Update progress based on transaction status
            setOperationProgress((prev) => {
              const updatedProgress = { ...prev };

              switch (status) {
                case "processing":
                  updatedProgress.currentStepIndex = 0;
                  updatedProgress.steps[0].status = "processing";
                  updatedProgress.overallStatus = "processing";
                  break;

                case "success":
                  updatedProgress.steps[0].status = "success";
                  updatedProgress.currentStepIndex = 1;
                  updatedProgress.steps[1].status = "success";
                  updatedProgress.overallStatus = "success";
                  break;

                case "error":
                  const processingIndex = updatedProgress.steps.findIndex(
                    (step) => step.status === "processing",
                  );

                  if (processingIndex >= 0) {
                    updatedProgress.steps[processingIndex].status = "error";
                  }
                  updatedProgress.overallStatus = "error";
                  break;
              }

              return updatedProgress;
            });
          },
        },
      );

      if (result.success) {
        setTxStatus("success");
        if (onSuccess) onSuccess();
      } else {
        setTxStatus("error");
        setTxError(result.error || "Transaction failed");
      }
    } catch (error) {
      console.error("Operation failed:", error);
      setTxStatus("error");
      setTxError(error instanceof Error ? error.message : "Transaction failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Token Info */}
      <div className="flex items-center">
        <img src={token.iconUrl} alt={token.symbol} className="w-24 h-6 mr-3" />
        <div>
          <h2 className="text-lg font-bold text-white">
            Withdraw {token.symbol}
          </h2>
        </div>
      </div>

      {/* Available amounts display */}
      <div className="grid grid-cols-2 gap-4">
        {canClaimPrincipal && (
          <div className="p-4 bg-[#1a1a24] rounded-lg border border-[#333344]">
            <div className="text-sm text-[#9999aa] mb-1">
              Available to claim
            </div>
            <div className="text-lg font-medium text-white">
              {formatUnits(maxClaimAmount, decimals)} {token.symbol}
            </div>
          </div>
        )}
        <div
          className={`p-4 bg-[#1a1a24] rounded-lg border border-[#333344] ${!canClaimPrincipal ? "col-span-2" : ""}`}
        >
          <div className="text-sm text-[#9999aa] mb-1">
            Available to withdraw
          </div>
          <div className="text-lg font-medium text-white">
            {formatUnits(maxWithdrawAmount, decimals)} {token.symbol}
          </div>
        </div>
      </div>

      {/* Withdraw Process Explainer */}
      {canClaimPrincipal && (
        <div className="p-4 bg-[#1a1a24] rounded-lg border border-[#333344]">
          <div className="flex items-start">
            <Info size={18} className="text-[#9999aa] mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-white mb-1">
                Two-Step Withdrawal Process
              </h4>
              <div className="text-xs text-[#9999aa] space-y-2">
                <div className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-[#333344] flex items-center justify-center text-xs mr-2">
                    1
                  </div>
                  <p>
                    First, claim your tokens from {destinationChain} to{" "}
                    {sourceChain}
                  </p>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-[#333344] flex items-center justify-center text-xs mr-2">
                    2
                  </div>
                  <p>Then, withdraw your tokens to your wallet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claim Section */}
      {canClaimPrincipal && maxClaimAmount > BigInt(0) && (
        <div className="p-4 border border-[#333344] rounded-lg bg-[#15151c]">
          <h3 className="text-md font-medium text-white mb-3 flex items-center">
            <div className="w-5 h-5 rounded-full bg-[#333344] flex items-center justify-center text-xs mr-2">
              1
            </div>
            Claim Tokens
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#9999aa]">From</span>
              <span className="text-white">{destinationChain}</span>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="text-[#9999aa]" size={16} />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-[#9999aa]">To</span>
              <span className="text-white">{sourceChain}</span>
            </div>

            <div className="space-y-2 mt-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-[#ddddee]">
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
                className="w-full px-3 py-2 bg-[#15151c] border border-[#333344] rounded-md text-white"
                placeholder={`Enter amount (max: ${formatUnits(maxClaimAmount, decimals)} ${token.symbol})`}
              />

              {claimAmountError && (
                <p className="text-sm text-red-500">{claimAmountError}</p>
              )}
            </div>

            <Button
              className="w-full py-3 bg-[#00e5ff] hover:bg-[#00e5ff]/90 text-black font-medium"
              disabled={
                (!!txStatus &&
                  txStatus !== "error" &&
                  activeOperation === "claim") ||
                !!claimAmountError ||
                !claimAmount ||
                !parsedClaimAmount ||
                parsedClaimAmount === BigInt(0)
              }
              onClick={handleClaimOperation}
            >
              {activeOperation === "claim" && txStatus === "processing"
                ? "Processing..."
                : activeOperation === "claim" && txStatus === "success"
                  ? "Success!"
                  : activeOperation === "claim" && txStatus === "error"
                    ? "Failed!"
                    : "Claim Tokens"}
            </Button>
          </div>
        </div>
      )}

      {/* Withdraw Section */}
      <div className="p-4 border border-[#333344] rounded-lg bg-[#15151c]">
        <h3 className="text-md font-medium text-white mb-3 flex items-center">
          {canClaimPrincipal && (
            <div className="w-5 h-5 rounded-full bg-[#333344] flex items-center justify-center text-xs mr-2">
              2
            </div>
          )}
          Withdraw Tokens
        </h3>

        <div className="space-y-3">
          {maxWithdrawAmount > BigInt(0) ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-[#ddddee]">
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
                  className="w-full px-3 py-2 bg-[#15151c] border border-[#333344] rounded-md text-white"
                  placeholder={`Enter amount (max: ${formatUnits(maxWithdrawAmount, decimals)} ${token.symbol})`}
                />

                {withdrawAmountError && (
                  <p className="text-sm text-red-500">{withdrawAmountError}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#ddddee]">
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
                  (!!txStatus &&
                    txStatus !== "error" &&
                    activeOperation === "withdraw") ||
                  !!withdrawAmountError ||
                  !withdrawAmount ||
                  !parsedWithdrawAmount ||
                  parsedWithdrawAmount === BigInt(0)
                }
                onClick={handleWithdrawOperation}
              >
                {activeOperation === "withdraw" && txStatus === "processing"
                  ? "Processing..."
                  : activeOperation === "withdraw" && txStatus === "success"
                    ? "Success!"
                    : activeOperation === "withdraw" && txStatus === "error"
                      ? "Failed!"
                      : "Withdraw Tokens"}
              </Button>
            </>
          ) : (
            <div className="p-4 rounded-lg border border-[#333344] bg-[#1a1a24]">
              <div className="flex items-center justify-center gap-2 text-[#9999aa]">
                <AlertCircle size={16} />
                <span>You don't have any tokens available to withdraw</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {txError && <p className="mt-3 text-sm text-red-500">{txError}</p>}

      {/* Progress overlay */}
      <OperationProgress
        progress={operationProgress}
        open={showProgress}
        onClose={() => {
          // Only allow closing if complete or error
          if (
            operationProgress.overallStatus === "success" ||
            operationProgress.overallStatus === "error"
          ) {
            setShowProgress(false);
          }
        }}
        onViewDetails={() => {
          // Navigate to transaction history
        }}
      />
    </div>
  );
}
