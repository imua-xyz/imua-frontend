// components/ui/operation-progress.tsx
import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2, ArrowRight, Clock, AlertCircle } from "lucide-react";
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

export type OperationStep = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "processing" | "success" | "error" | "waiting";
  errorMessage?: string;
  txHash?: string;
  explorerUrl?: string;
};

export const approvalStep: OperationStep = {
  id: "approval",
  title: "Token Approval",
  description: "Approve tokens for staking",
  status: "pending",
};

export const transactionStep: OperationStep = {
  id: "transaction",
  title: "Submit Transaction",
  description: "Sending transaction",
  status: "pending",
};

export const confirmationStep: OperationStep = {
  id: "confirmation",
  title: "Transaction Confirmation",
  description: "Waiting for transaction to be confirmed",
  status: "pending",
};

export const relayingStep: OperationStep = {
  id: "relaying",
  title: "Cross-Chain Message",
  description: "Relaying message to destination chain",
  status: "pending",
};  

export const completionStep: OperationStep = {
  id: "completion",
  title: "Process Completion",
  description: "Verifying final balance update",
  status: "pending",
};

export type OperationProgress = {
  operation: string;
  chainInfo?: {
    sourceChain?: string;
    destinationChain?: string;
  };
  steps: OperationStep[];
  currentStepIndex: number;
  overallStatus: TxStatus | "relaying" | "verifying" | null;
};

interface OperationProgressProps {
  progress: OperationProgress;
  open: boolean;
  onClose: () => void;
  onViewDetails?: () => void;
}

export function OperationProgress({
  progress,
  open,
  onClose,
  onViewDetails,
}: OperationProgressProps) {
  const [progressValue, setProgressValue] = useState(0);
  const isCrossChain = !!(progress.chainInfo?.sourceChain && progress.chainInfo?.destinationChain);
  const hasError = progress.steps.some(step => step.status === "error");

  // Calculate progress percentage based on steps
  useEffect(() => {
    const totalSteps = progress.steps.length;
    const completedSteps = progress.steps.filter(
      (step) => step.status === "success",
    ).length;

    // If there's an error, stop at current step
    if (hasError) {
      // Calculate progress up to the error step
      const errorIndex = progress.steps.findIndex(
        (step) => step.status === "error",
      );
      setProgressValue((errorIndex / (totalSteps - 1)) * 100);
    } else if (progress.overallStatus === "success") {
      setProgressValue(100);
    } else {
      // Calculate progress based on completed + half credit for processing
      const processingCredit = progress.steps.some(
        (step) => step.status === "processing",
      )
        ? 0.5
        : 0;

      setProgressValue(
        ((completedSteps + processingCredit) / totalSteps) * 100,
      );
    }
  }, [progress, hasError]);

  // Get error message if any
  const errorStep = progress.steps.find(step => step.status === "error");
  const errorMessage = errorStep?.errorMessage || "Transaction failed. You may try again.";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#13131a] border-[#222233] text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-white">
            {progress.operation.charAt(0).toUpperCase() +
              progress.operation.slice(1)}{" "}
            Progress
          </DialogTitle>
        </DialogHeader>

        {/* Chain indication - only show if cross-chain */}
        {isCrossChain && (
          <div className="flex items-center justify-center text-sm text-[#9999aa] mb-4">
            <span className="font-medium text-white">{progress.chainInfo?.sourceChain}</span>
            <ArrowRight className="mx-2 text-[#00e5ff]" size={16} />
            <span className="font-medium text-white">{progress.chainInfo?.destinationChain}</span>
          </div>
        )}

        {/* Overall progress bar */}
        <div className="relative h-2 w-full bg-[#222233] rounded-full overflow-hidden mb-6">
          <div 
            className={`h-full transition-all duration-500 ease-out ${
              progress.overallStatus === "error" 
                ? "bg-red-500" 
                : progress.overallStatus === "success" 
                  ? "bg-green-500" 
                  : "bg-[#00e5ff]"
            }`}
            style={{ width: `${progressValue}%` }}
          ></div>
        </div>

        {/* Error summary - only show if there's an error */}
        {hasError && (
          <div className="mb-4 p-3 bg-[#2d0d0d]/30 border border-red-500/30 rounded-lg flex items-start">
            <AlertCircle className="text-red-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
            <div>
              <p className="text-red-400 text-sm font-medium">Transaction failed</p>
              <p className="text-[#9999aa] text-xs mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Steps list with connecting lines */}
        <div className="space-y-0">
          {progress.steps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Step content */}
              <div 
                className={`flex items-start p-4 rounded-lg mb-1 ${
                  step.status === "error" 
                    ? "bg-[#2d0d0d]/20 border border-red-500/20" 
                    : step.status === "success"
                      ? "bg-[#0d2d1d]/20 border border-green-500/20"
                      : step.status === "processing"
                        ? "bg-[#0d1d2d]/20 border border-[#00e5ff]/20"
                        : index === progress.currentStepIndex
                          ? "bg-[#1a1a24] border border-[#333344]"
                          : ""
                }`}
              >
                {/* Status icon */}
                <div className="mr-3 mt-0.5">
                  {step.status === "success" && (
                    <div className="w-6 h-6 rounded-full bg-[#0d2d1d] flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-[#4ade80]" />
                    </div>
                  )}
                  {step.status === "error" && (
                    <div className="w-6 h-6 rounded-full bg-[#2d0d0d] flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  {step.status === "processing" && (
                    <div className="w-6 h-6 rounded-full bg-[#0d1d2d] flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-[#00e5ff] animate-spin" />
                    </div>
                  )}
                  {step.status === "pending" && (
                    <div className="w-6 h-6 rounded-full bg-[#222233] flex items-center justify-center">
                      <Clock className="h-4 w-4 text-[#9999aa]" />
                    </div>
                  )}
                  {step.status === "waiting" && (
                    <div className="w-6 h-6 rounded-full bg-[#2d2d0d] flex items-center justify-center">
                      <Clock className="h-4 w-4 text-yellow-500" />
                    </div>
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    step.status === "success" ? "text-[#4ade80]" :
                    step.status === "error" ? "text-red-500" :
                    step.status === "processing" ? "text-[#00e5ff]" :
                    step.status === "waiting" ? "text-yellow-500" : "text-white"
                  }`}>{step.title}</h4>
                  <p className="text-sm text-[#9999aa] mt-1">
                    {step.description}
                  </p>

                  {/* Error message if applicable */}
                  {step.status === "error" && step.errorMessage && (
                    <p className="text-xs text-red-400 mt-1">
                      {step.errorMessage}
                    </p>
                  )}

                  {/* Transaction hash if available */}
                  {step.txHash && step.explorerUrl && (
                    <a
                      href={step.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#00e5ff] hover:underline mt-2 inline-block"
                    >
                      View transaction
                    </a>
                  )}
                </div>
              </div>
              
              {/* Connecting line - don't show for last step */}
              {index < progress.steps.length - 1 && (
                <div className="absolute left-[13px] top-[38px] h-4 w-[2px] bg-[#333344]"></div>
              )}
            </div>
          ))}
        </div>

        {/* Next steps guidance - show when there's an error */}
        {hasError && (
          <div className="mt-4 p-3 bg-[#1a1a24] rounded-lg">
            <p className="text-sm text-[#9999aa]">
              <span className="text-white font-medium">What's next? </span> 
              You can try the operation again or view transaction details for more information.
            </p>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between mt-6 pt-4 border-t border-[#222233]">
          {progress.overallStatus === "success" ||
          progress.overallStatus === "error" ? (
            <>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="bg-transparent border-[#333344] text-white hover:bg-[#222233]"
              >
                Close
              </Button>
              {onViewDetails && (
                <Button 
                  onClick={onViewDetails}
                  className="bg-[#00e5ff] hover:bg-[#00c8df] text-black"
                >
                  View Details
                </Button>
              )}
            </>
          ) : (
            <div className="w-full text-center text-sm text-[#9999aa] py-2">
              Please keep this window open until the process completes
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}