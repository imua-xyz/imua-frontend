// components/ui/cross-chain-progress.tsx
import { useState, useEffect } from "react";
import {
  OperationProgress,
  OperationStep,
  approvalStep,
  transactionStep,
  confirmationStep,
  relayingStep,
  completionStep,
} from "./operation-progress";
import { TxStatus } from "@/types/staking";

export type CrossChainStep = OperationStep;

export type CrossChainProgress = {
  sourceChain: string;
  destinationChain: string;
  operation: "deposit" | "stake" | "withdraw" | "claim" | string;
  steps: CrossChainStep[]; // Optional now, we'll provide defaults
  currentStepIndex: number; // Optional now, we'll manage internally
  overallStatus: TxStatus | "relaying" | "verifying" | null; // Optional now
  txHash?: string;
  explorerUrl?: string;
};

interface CrossChainProgressProps {
  sourceChain: string;
  destinationChain: string;
  operation: "deposit" | "stake" | "withdraw" | "claim" | string;
  open: boolean;
  txStatus: TxStatus | null;
  txHash?: string;
  explorerUrl?: string;
  onClose: () => void;
  onViewDetails?: () => void;
  onStatusChange?: (
    status: TxStatus | "relaying" | "verifying" | "success" | "error" | null,
  ) => void;
}

export function CrossChainProgress({
  sourceChain,
  destinationChain,
  operation,
  txHash,
  explorerUrl,
  open,
  txStatus,
  onClose,
  onViewDetails,
  onStatusChange,
}: CrossChainProgressProps) {
  // Initialize with default steps if not provided
  const [progress, setProgress] = useState<CrossChainProgress>(() => {
    const defaultSteps = [
      { ...approvalStep },
      {
        ...transactionStep,
        description: `Sending ${operation} transaction`,
      },
      { ...confirmationStep },
      {
        ...relayingStep,
        description: `Relaying message to ${destinationChain}`,
      },
      { ...completionStep },
    ];

    return {
      sourceChain,
      destinationChain,
      operation,
      steps: defaultSteps,
      currentStepIndex: 0,
      overallStatus: null,
      txHash,
      explorerUrl,
    };
  });

  // Update progress based on transaction status
  useEffect(() => {
    if (!txStatus) return;

    setProgress((prev) => {
      const updatedProgress = { ...prev };
      const steps = [...(updatedProgress.steps || [])];

      switch (txStatus) {
        case "approving":
          updatedProgress.currentStepIndex = 0;
          steps[0].status = "processing";
          updatedProgress.overallStatus = "approving";
          break;

        case "processing":
          // If we're moving from approval to processing
          if (steps[0].status === "processing") {
            steps[0].status = "success";
          }
          updatedProgress.currentStepIndex = 1;
          steps[1].status = "processing";
          updatedProgress.overallStatus = "processing";
          break;

        case "success":
          // Transaction confirmed on source chain
          steps[0].status = "success"; // Approval
          steps[1].status = "success"; // Transaction
          updatedProgress.currentStepIndex = 2;
          steps[2].status = "success"; // Confirmation
          updatedProgress.currentStepIndex = 3;
          steps[3].status = "processing"; // Now relaying
          updatedProgress.overallStatus = "relaying";

          // Simulate cross-chain completion with timeouts
          setTimeout(() => {
            setProgress((prev) => {
              const updated = { ...prev };
              const updatedSteps = [...(updated.steps || [])];
              updatedSteps[3].status = "success"; // Relay complete
              updated.currentStepIndex = 4;
              updatedSteps[4].status = "processing"; // Verifying completion
              updated.overallStatus = "verifying";
              onStatusChange?.("verifying");
              return { ...updated, steps: updatedSteps };
            });

            setTimeout(() => {
              setProgress((prev) => {
                const final = { ...prev };
                const finalSteps = [...(final.steps || [])];
                finalSteps[4].status = "success";
                final.overallStatus = "success";
                onStatusChange?.("success");
                return { ...final, steps: finalSteps };
              });
            }, 3000);
          }, 5000);
          break;

        case "error":
          // Find the current processing step and mark it as error
          const processingIndex = steps.findIndex(
            (step) => step.status === "processing",
          );

          if (processingIndex >= 0) {
            steps[processingIndex].status = "error";
          }
          updatedProgress.overallStatus = "error";
          break;
      }

      // Update transaction hash if available
      if (txHash && steps[1]) {
        steps[1].txHash = txHash;
        steps[1].explorerUrl = explorerUrl;
      }

      return { ...updatedProgress, steps };
    });
  }, [txStatus, txHash, explorerUrl, onStatusChange]);

  // Convert to OperationProgress format
  const operationProgress = {
    operation: progress.operation,
    chainInfo: {
      sourceChain: progress.sourceChain,
      destinationChain: progress.destinationChain,
    },
    steps: progress.steps || [],
    currentStepIndex: progress.currentStepIndex || 0,
    overallStatus: progress.overallStatus || null,
  };

  // Reset progress when dialog is closed
  const handleClose = () => {
    // Only allow closing if complete or error
    if (
      progress.overallStatus === "success" ||
      progress.overallStatus === "error"
    ) {
      onClose();

      // Reset progress for next operation
      setTimeout(() => {
        setProgress((prev) => ({
          ...prev,
          steps:
            prev.steps?.map((step) => ({ ...step, status: "pending" })) || [],
          currentStepIndex: 0,
          overallStatus: null,
        }));
        onStatusChange?.(null);
      }, 500);
    }
  };

  return (
    <OperationProgress
      progress={operationProgress}
      open={open}
      onClose={handleClose}
      onViewDetails={onViewDetails}
    />
  );
}
