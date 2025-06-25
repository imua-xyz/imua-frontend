// components/ui/native-chain-progress.tsx
import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2, Clock, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TxStatus } from "@/types/staking";
import { 
    OperationProgress, 
    OperationStep,
    approvalStep,
    transactionStep,
    confirmationStep,
    completionStep
  } from "./operation-progress";

export type NativeOperationStep = OperationStep;

export type NativeChainProgress = {
  chain: string;
  operation: string;
  steps: NativeOperationStep[];
  currentStepIndex: number;
  overallStatus: TxStatus | "verifying" | null;
  txHash?: string;
  explorerUrl?: string;
};

interface NativeChainProgressProps {
    chain: string;
    operation: string;
    txHash?: string;
    explorerUrl?: string;

    open: boolean;
    txStatus: TxStatus | null;
    onClose: () => void;
  onViewDetails?: () => void;
  onStatusChange?: (status: TxStatus | "verifying" | null) => void;
}

export function NativeChainProgress({
  chain,
  operation,
  txHash,
  explorerUrl,
  open,
  txStatus,
  onClose,
  onViewDetails,
  onStatusChange,
}: NativeChainProgressProps) {
    const [progress, setProgress] = useState<NativeChainProgress>(() => {
        const defaultSteps = [
          { ...approvalStep },
          { 
            ...transactionStep, 
            description: `Sending ${operation} transaction` 
          },
          { ...confirmationStep },
          { ...completionStep }
        ];
        
        return {
          chain,
          operation,
          steps: defaultSteps,
          currentStepIndex: 0,
          overallStatus: null,
          txHash,
          explorerUrl
        };
      });

  // Update progress based on transaction status
  useEffect(() => {
    if (!txStatus) return;

    setProgress(prev => {
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
          
          // Simulate completion with timeouts
          setTimeout(() => {
            setProgress(prev => {
              const updated = { ...prev };
              const updatedSteps = [...(updated.steps || [])];
              updatedSteps[3].status = "processing"; // Relay complete
              updated.overallStatus = "verifying";
              onStatusChange?.("verifying");
              return { ...updated, steps: updatedSteps };
            });

            setTimeout(() => {
              setProgress(prev => {
                const final = { ...prev };
                const finalSteps = [...(final.steps || [])];
                finalSteps[3].status = "success";
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
      destinationChain: progress.chain,
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
        setProgress(prev => ({
          ...prev,
          steps: prev.steps?.map(step => ({ ...step, status: "pending" })) || [],
          currentStepIndex: 0,
          overallStatus: null
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