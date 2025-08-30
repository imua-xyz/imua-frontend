// components/ui/operation-progress.tsx
import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2, ArrowRight, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phase, PhaseStatus, OverallStatus } from "@/types/staking";

export type OperationStep = {
  phase: Phase;
  title: string;
  description: string;
  status: PhaseStatus;
  errorMessage?: string;
  txHash?: string;
  explorerUrl?: string;
  estimatedTime?: string;
  explanation?: string;
};

export const approvalStep: OperationStep = {
  phase: "approving",
  title: "Token Approval",
  description: "Approve tokens for staking",
  status: "pending",
};

export const transactionStep: OperationStep = {
  phase: "sendingTx",
  title: "Submit Transaction",
  description: "Sending transaction",
  status: "pending",
};

export const confirmationStep: OperationStep = {
  phase: "confirmingTx",
  title: "Transaction Confirmation",
  description: "Waiting for transaction to be confirmed",
  status: "pending",
  estimatedTime: "10 sec",
};

export const sendingRequestStep: OperationStep = {
  phase: "sendingRequest",
  title: "Cross-Chain Message",
  description: "Relaying message to destination chain",
  status: "pending",
  estimatedTime: "60 sec",
  explanation:
    "This step takes time to ensure security across multiple blockchains.",
};

export const receivingResponseStep: OperationStep = {
  phase: "receivingResponse",
  title: "Receive Response",
  description: "Waiting for response from destination chain",
  status: "pending",
  estimatedTime: "60 sec",
};

export const completionStep: OperationStep = {
  phase: "verifyingCompletion",
  title: "Process Completion",
  description: "Verifying final balance update",
  status: "pending",
  estimatedTime: "3 sec",
};

export type OperationProgress = {
  operation: string;
  chainInfo?: {
    sourceChain?: string;
    destinationChain?: string;
  };
  steps: OperationStep[];
  overallStatus: OverallStatus;
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
  const isCrossChain = !!(
    progress.chainInfo?.sourceChain && progress.chainInfo?.destinationChain
  );
  const hasError = progress.steps.some((step) => step.status === "error");
  const success =
    progress.overallStatus.currentPhase === "verifyingCompletion" &&
    progress.overallStatus.currentPhaseStatus === "success";

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
    } else if (success) {
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
  }, [progress, hasError, success]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        // Only allow closing if operation is completed (success/error) or if explicitly opening
        if (!isOpen && (success || hasError)) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md bg-[#13131a] border-[#222233] text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-white">
            {progress.operation.charAt(0).toUpperCase() +
              progress.operation.slice(1)}{" "}
            Progress
            {!success && !hasError && (
              <div className="text-sm font-normal text-[#9999aa] mt-1">
                (Keep window open)
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Chain indication - only show if cross-chain */}
        {isCrossChain && (
          <div className="flex items-center justify-center text-sm text-[#9999aa] mb-4">
            <span className="font-medium text-white">
              {progress.chainInfo?.sourceChain}
            </span>
            <ArrowRight className="mx-2 text-[#00e5ff]" size={16} />
            <span className="font-medium text-white">
              {progress.chainInfo?.destinationChain}
            </span>
          </div>
        )}

        {/* Overall progress bar */}
        <div className="relative h-2 w-full bg-[#222233] rounded-full overflow-hidden mb-6">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              hasError
                ? "bg-red-500"
                : success
                  ? "bg-green-500"
                  : "bg-[#00e5ff]"
            }`}
            style={{ width: `${progressValue}%` }}
          ></div>
        </div>

        {/* Simple step counter */}
        {!hasError && !success && (
          <div className="text-center mb-4">
            <div className="text-sm text-[#9999aa] mb-2">
              Step{" "}
              {Math.max(
                1,
                progress.steps.findIndex(
                  (step) => step.status === "processing",
                ) + 1,
              )}{" "}
              of {progress.steps.length}
            </div>
          </div>
        )}

        {/* Steps list with connecting lines */}
        <div className="space-y-0">
          {progress.steps.map((step, index) => (
            <div key={step.phase} className="relative">
              {/* Step content */}
              <div
                className={`flex items-start p-4 rounded-lg mb-1 ${
                  step.status === "error"
                    ? "bg-[#2d0d0d]/20 border border-red-500/20"
                    : step.status === "processing"
                      ? "bg-[#0d1d2d]/20 border border-[#00e5ff]/20"
                      : step.status === "success"
                        ? "bg-[#0d2d1d]/20 border border-green-500/20"
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
                </div>

                {/* Step content */}
                <div className="flex-1">
                  <h4
                    className={`font-medium ${
                      step.status === "success"
                        ? "text-[#4ade80]"
                        : step.status === "error"
                          ? "text-red-500"
                          : step.status === "processing"
                            ? "text-[#00e5ff]"
                            : "text-white"
                    }`}
                  >
                    {step.title}
                  </h4>
                  <div className="text-sm text-[#9999aa] mt-1">
                    <p>
                      {step.description}
                      {step.estimatedTime && (
                        <span className="text-xs text-[#666677] ml-2">
                          (est. time {step.estimatedTime})
                        </span>
                      )}
                    </p>
                    {step.explanation &&
                      step.status === "processing" &&
                      step.phase === "sendingRequest" && (
                        <p className="text-xs text-[#666677] mt-2 italic">
                          {step.explanation}
                        </p>
                      )}
                  </div>

                  {/* Error message if applicable */}
                  {step.status === "error" && step.errorMessage && (
                    <p className="text-xs text-red-400 mt-1">
                      {step.errorMessage}
                    </p>
                  )}

                  {/* Transaction hash if available */}
                  {step.txHash && step.explorerUrl && (
                    <a
                      href={`${step.explorerUrl}${step.txHash}`}
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
              <span className="text-white font-medium">What is next? </span>
              You can try the operation again or view transaction details for
              more information.
            </p>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between mt-6 pt-4 border-t border-[#222233]">
          {success || hasError ? (
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
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse"></div>
                <span>
                  Please keep this window open until the process completes
                </span>
                <div className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse"></div>
              </div>
              {isCrossChain && (
                <div className="text-xs text-[#666677] mt-2">
                  Cross-chain operations typically take 1-2 minutes
                </div>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
