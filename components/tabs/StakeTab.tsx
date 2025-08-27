// components/new-staking/tabs/StakeTab.tsx
import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAmountInput } from "@/hooks/useAmountInput";
import { Phase, PhaseStatus } from "@/types/staking";
import { formatUnits } from "viem";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  OperationProgress,
  OperationStep,
  approvalStep,
  transactionStep,
  confirmationStep,
  sendingRequestStep,
  completionStep,
} from "@/components/ui/operation-progress";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { useOperatorsContext } from "@/contexts/OperatorsContext";
import { useBootstrapStatus } from "@/hooks/useBootstrapStatus";
import { OperatorSelectionModal } from "@/components/modals/OperatorSelectionModal";
import { OperatorInfo } from "@/types/operator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { getShortErrorMessage } from "@/lib/utils";

interface StakeTabProps {
  sourceChain: string;
  destinationChain: string;
  onSuccess?: () => void;
}

export function StakeTab({
  sourceChain,
  destinationChain,
  onSuccess,
}: StakeTabProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState<"amount" | "review">("amount");
  const [showOperatorModal, setShowOperatorModal] = useState(false);

  // Context hooks
  const stakingService = useStakingServiceContext();
  const token = stakingService.token;

  // Get bootstrap status directly
  const { bootstrapStatus } = useBootstrapStatus();

  // Check if this is a native chain operation (not cross-chain)
  // This considers both bootstrap phase and token-specific requirements
  const isNativeChainOperation =
    !bootstrapStatus?.isBootstrapped ||
    !!token.connector?.requireExtraConnectToImua;
  const { operators } = useOperatorsContext();

  // Check mode availability based on both props
  const isDepositThenDelegateDisabled =
    !!stakingService.isDepositThenDelegateDisabled;
  const isOnlyDepositThenDelegateAllowed =
    !!stakingService.isOnlyDepositThenDelegateAllowed;

  // Determine which modes are available
  const isStakeModeAvailable = !isDepositThenDelegateDisabled;
  const isDepositModeAvailable = !isOnlyDepositThenDelegateAllowed;

  // If only stake mode is allowed, force stake mode
  const canSwitchModes = isStakeModeAvailable && isDepositModeAvailable;

  // Balance and amount state
  const balance = stakingService.walletBalance?.value || BigInt(0);
  const maxAmount = balance;
  const decimals = stakingService.walletBalance?.decimals || 0;
  const {
    amount,
    parsedAmount,
    error: amountError,
    setAmount,
  } = useAmountInput({
    decimals: decimals,
    minimumAmount: stakingService.minimumStakeAmount,
    maxAmount: maxAmount,
  });

  // Staking mode state - force stake mode if it's the only allowed mode
  const [isStakeMode, setIsStakeMode] = useState(
    isOnlyDepositThenDelegateAllowed ? true : true,
  );

  // Force stake mode if it's the only allowed mode
  useEffect(() => {
    if (isOnlyDepositThenDelegateAllowed) {
      setIsStakeMode(true);
    }
  }, [isOnlyDepositThenDelegateAllowed]);
  const [selectedOperator, setSelectedOperator] = useState<OperatorInfo | null>(
    null,
  );

  // Operation progress state
  const [showProgress, setShowProgress] = useState(false);
  const [operationSteps, setOperationSteps] = useState<OperationStep[]>([]);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);

  // Initialize operation steps based on operation mode
  useEffect(() => {
    let steps: OperationStep[] = [];

    if (isNativeChainOperation) {
      // Local mode: approval, transaction, confirmation, completion
      steps = [
        { ...approvalStep },
        { ...transactionStep },
        { ...confirmationStep },
        { ...completionStep },
      ];
      // Update descriptions for local context
      steps[1].description = "Sending stake transaction";
      steps[2].description = "Waiting for transaction confirmation";
    } else {
      // Cross-chain mode: approval, transaction, confirmation, relay, completion
      steps = [
        { ...approvalStep },
        { ...transactionStep },
        { ...confirmationStep },
        { ...sendingRequestStep },
        { ...completionStep },
      ];
      // Update descriptions for cross-chain context
      steps[1].description = "Sending stake transaction";
      steps[3].description = `Relaying message to ${destinationChain}`;
    }

    setOperationSteps(steps);
  }, [destinationChain, isNativeChainOperation]);

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

  // Try to restore last used operator from localStorage
  useEffect(() => {
    if (operators && operators.length > 0) {
      const lastOperatorAddress = localStorage.getItem(
        `lastOperator_${token.symbol}`,
      );
      if (lastOperatorAddress) {
        const savedOperator = operators.find(
          (op) => op.address === lastOperatorAddress,
        );
        if (savedOperator) {
          setSelectedOperator(savedOperator);
        }
      }
    }
  }, [operators, token.symbol]);

  // Parse operator name from meta info
  const getOperatorName = (operator: OperatorInfo): string => {
    try {
      return operator.operator_meta_info || "Unknown Operator";
    } catch {
      return "Unknown Operator";
    }
  };

  // Handle operator selection
  const handleOperatorSelect = (operator: OperatorInfo) => {
    setSelectedOperator(operator);

    // Save selected operator to localStorage
    localStorage.setItem(`lastOperator_${token.symbol}`, operator.address);

    // Close the modal
    setShowOperatorModal(false);

    // Move to review step
    setCurrentStep("review");
  };

  // Handle continue button click
  const handleContinue = () => {
    if (isStakeMode && isStakeModeAvailable) {
      setShowOperatorModal(true);
    } else {
      setCurrentStep("review");
    }
  };

  // Handle stake/deposit operation
  const handleOperation = async () => {
    // Reset progress state
    setOperationSteps((prev) =>
      prev.map((step) => ({ ...step, status: "pending" })),
    );
    setShowProgress(true);

    try {
      const result = await stakingService.stake(
        parsedAmount,
        isStakeMode && isStakeModeAvailable && selectedOperator
          ? selectedOperator.address
          : undefined,
        {
          onPhaseChange: handlePhaseChange,
        },
      );

      if (result.hash) {
        setTxHash(result.hash);
      }

      if (result.success) {
        // ✅ FIX: Mark the final step (verifying completion) as success
        setOperationSteps((prev) => {
          const updated = [...prev];
          // Find the last step (verifying completion) and mark it as success
          const lastStepIndex = updated.length - 1;
          if (updated[lastStepIndex]) {
            updated[lastStepIndex].status = "success";
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
              result.error || "Operation failed";
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
          // Mark the processing step as error
          updated[processingStepIndex].status = "error";
          updated[processingStepIndex].errorMessage =
            getShortErrorMessage(error);
        } else {
          // If no processing step found, mark the first step as error
          if (updated.length > 0) {
            updated[0].status = "error";
            updated[0].errorMessage = getShortErrorMessage(error);
          }
        }
        return updated;
      });
    }
  };

  // Format button text based on state
  const getButtonText = () => {
    if (showProgress) return "Processing...";

    if (currentStep === "amount") return "Continue";

    if (!isStakeModeAvailable) return "Deposit";
    return isStakeMode ? "Stake" : "Deposit";
  };

  // Calculate estimated rewards (if applicable)
  const calculateEstimatedRewards = () => {
    if (!selectedOperator || !parsedAmount) return "0";

    const amountNumber = Number(formatUnits(parsedAmount, decimals));
    const yearlyRewards = amountNumber * (selectedOperator.apr / 100);

    return yearlyRewards;
  };

  // Create operation progress data
  const operationProgress = {
    operation:
      isStakeMode && isStakeModeAvailable && selectedOperator
        ? "stake"
        : "deposit",
    chainInfo: isNativeChainOperation
      ? undefined
      : {
          sourceChain,
          destinationChain,
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

        return "approving";
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
  };

  // Handle modal close - only reset on success
  const handleModalClose = () => {
    // Check if operation completed successfully by checking final step status
    const isSuccess =
      operationSteps.length > 0 &&
      operationSteps[operationSteps.length - 1]?.status === "success";

    // Check if operation failed (any step has error status)
    const hasError = operationSteps.some((step) => step.status === "error");

    if (isSuccess) {
      // Reset to initial state only on success
      setCurrentStep("amount");
      setAmount("");
      setSelectedOperator(null);
      // Reset steps back to pending (not empty)
      setOperationSteps((prev) =>
        prev.map((step) => ({ ...step, status: "pending" })),
      );
      setTxHash(undefined);
    } else if (hasError) {
      // On error, just reset the steps to pending but keep other state
      setOperationSteps((prev) =>
        prev.map((step) => ({ ...step, status: "pending" })),
      );
      setTxHash(undefined);
    }

    // Always close modal (success, error, or user cancellation)
    setShowProgress(false);
  };

  return (
    <div className="space-y-5">
      {/* Step indicator - more subtle */}
      <div className="flex items-center justify-center mb-2">
        <div
          className={`flex items-center justify-center w-7 h-7 rounded-full ${
            currentStep === "amount"
              ? "bg-[#00e5ff] text-black"
              : "bg-[#222233] text-[#9999aa]"
          }`}
        >
          1
        </div>
        <div className="h-[1px] w-10 bg-[#222233]"></div>
        <div
          className={`flex items-center justify-center w-7 h-7 rounded-full ${
            currentStep === "review"
              ? "bg-[#00e5ff] text-black"
              : "bg-[#222233] text-[#9999aa]"
          }`}
        >
          2
        </div>
      </div>

      {/* STEP 1: Amount Entry */}
      {currentStep === "amount" && (
        <>
          {/* Amount input - cleaner design */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-white">
                Amount to {isStakeMode ? "stake" : "deposit"}
              </label>
              <div className="flex items-center space-x-2 text-xs text-[#9999aa]">
                <span>
                  Balance: {formatUnits(balance, decimals)} {token.symbol}
                </span>
                <button
                  className="text-xs font-medium text-[#00e5ff] ml-1"
                  onClick={() => setAmount(formatUnits(balance, decimals))}
                >
                  MAX
                </button>
              </div>
            </div>

            <Input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-[#15151c] border border-[#333344] rounded-md text-white text-lg"
              placeholder="0.0"
            />

            {amountError && (
              <p className="text-sm text-red-500">{amountError}</p>
            )}
          </div>

          {/* Stake mode toggle - only show if both modes are available */}
          {canSwitchModes && (
            <div className="flex items-center justify-between p-3 bg-[#1a1a24] rounded-lg">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isStakeMode}
                  onCheckedChange={(value) => setIsStakeMode(value)}
                  id="stake-mode"
                  disabled={!canSwitchModes}
                />
                <Label
                  htmlFor="stake-mode"
                  className="font-medium text-white flex items-center"
                >
                  Stake & Earn Rewards
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle
                          size={14}
                          className="ml-1.5 text-[#9999aa] cursor-help"
                        />
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-xs bg-[#222233] text-white border-[#333344] p-3"
                      >
                        <p className="text-xs">
                          <span className="font-medium text-[#00e5ff]">
                            Stake & Earn
                          </span>
                          : Combines deposit and delegate in one transaction,
                          allowing you to start earning rewards immediately.
                        </p>
                        <p className="text-xs mt-1">
                          <span className="font-medium text-[#00e5ff]">
                            Deposit only
                          </span>
                          : Transfers assets to the chain without delegation.
                          You will need to delegate separately to earn rewards.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
              </div>
            </div>
          )}

          {/* Continue button */}
          <Button
            className="w-full py-3 bg-[#00e5ff] hover:bg-[#00c8df] text-black font-medium"
            disabled={
              !!amountError ||
              !amount ||
              !parsedAmount ||
              parsedAmount === BigInt(0)
            }
            onClick={handleContinue}
          >
            Continue
          </Button>
        </>
      )}

      {/* STEP 2: Review - cleaner layout */}
      {currentStep === "review" && (
        <>
          <div className="space-y-4">
            {/* Transaction summary */}
            <div className="p-4 bg-[#1a1a24] rounded-lg space-y-3">
              {/* Amount summary */}
              <div className="flex justify-between items-center">
                <span className="text-[#9999aa]">Amount</span>
                <div className="flex items-center">
                  <span className="font-medium text-white mr-2">
                    {amount} {token.symbol}
                  </span>
                  <button
                    className="text-xs text-[#00e5ff]"
                    onClick={() => setCurrentStep("amount")}
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Operation type */}
              <div className="flex justify-between">
                <span className="text-[#9999aa]">Operation</span>
                <span className="text-white">
                  {isStakeMode ? "Stake" : "Deposit"}
                </span>
              </div>

              {/* Selected operator (if staking) */}
              {isStakeMode && isStakeModeAvailable && (
                <div className="flex justify-between items-center">
                  <span className="text-[#9999aa]">Operator</span>
                  <div className="flex items-center">
                    {selectedOperator ? (
                      <>
                        <span className="text-white mr-2">
                          {getOperatorName(selectedOperator)}
                        </span>
                        <button
                          className="text-xs text-[#00e5ff]"
                          onClick={() => setShowOperatorModal(true)}
                        >
                          Change
                        </button>
                      </>
                    ) : (
                      <button
                        className="text-[#00e5ff]"
                        onClick={() => setShowOperatorModal(true)}
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Estimated rewards section - cleaner */}
            {isStakeMode &&
              isStakeModeAvailable &&
              selectedOperator &&
              parsedAmount &&
              parsedAmount > BigInt(0) && (
                <div className="p-4 bg-[#0d2d1d] rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-[#4ade80]">
                      Estimated Rewards
                    </h4>
                    <span className="font-bold text-[#4ade80]">
                      {selectedOperator.apr}% APR
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#86efac]">Yearly rewards</span>
                    <span className="text-[#4ade80]">
                      ~{calculateEstimatedRewards()} {token.symbol}
                    </span>
                  </div>
                </div>
              )}

            {/* Fee information */}
            <div className="flex items-center text-xs text-[#9999aa] px-1">
              <Info size={12} className="mr-1 flex-shrink-0" />
              <span>No additional fees for this transaction</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 border-[#333344] text-white hover:bg-[#222233]"
              onClick={() => setCurrentStep("amount")}
            >
              Back
            </Button>

            <Button
              className="flex-1 bg-[#00e5ff] hover:bg-[#00c8df] text-black font-medium"
              disabled={
                showProgress ||
                (isStakeMode && isStakeModeAvailable && !selectedOperator) ||
                !parsedAmount ||
                parsedAmount === BigInt(0)
              }
              onClick={handleOperation}
            >
              {getButtonText()}
            </Button>
          </div>
        </>
      )}

      {/* Operator Selection Modal */}
      <OperatorSelectionModal
        isOpen={showOperatorModal}
        onClose={() => setShowOperatorModal(false)}
        onSelect={handleOperatorSelect}
        operators={operators || []}
        selectedOperator={selectedOperator}
      />

      {/* Operation Progress Modal */}
      <OperationProgress
        progress={operationProgress}
        open={showProgress}
        onClose={handleModalClose}
        onViewDetails={() => {
          if (token.network.txExplorerUrl && txHash) {
            window.open(`${token.network.txExplorerUrl}${txHash}`, "_blank");
          }
        }}
      />
    </div>
  );
}
