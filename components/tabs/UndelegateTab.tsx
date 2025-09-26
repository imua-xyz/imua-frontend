// components/tabs/UndelegateTab.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { useAmountInput } from "@/hooks/useAmountInput";
import { Phase, PhaseStatus } from "@/types/staking";
import { formatUnits } from "viem";
import {
  OperationProgress,
  OperationStep,
  transactionStep,
  confirmationStep,
  sendingRequestStep,
  completionStep,
} from "@/components/ui/operation-progress";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { useDelegations } from "@/hooks/useDelegations";
import { useBootstrapStatus } from "@/hooks/useBootstrapStatus";
import { DelegationPerOperator } from "@/types/delegations";
import { Info, ChevronDown } from "lucide-react";
import { UNBOND_PERIOD } from "@/config/cosmos";
import { getShortErrorMessage } from "@/lib/utils";

interface UndelegateTabProps {
  sourceChain: string;
  destinationChain: string;
  onSuccess?: () => void;
}

export function UndelegateTab({
  sourceChain,
  destinationChain,
  onSuccess,
}: UndelegateTabProps) {
  // Step management - same as DelegateTab
  const [currentStep, setCurrentStep] = useState<"delegation" | "review">(
    "delegation",
  );
  const [showDelegationModal, setShowDelegationModal] = useState(false);

  // Context hooks
  const stakingService = useStakingServiceContext();
  const token = stakingService.token;

  // Get delegations for this token
  const { data: delegationsData, isLoading: delegationsLoading } =
    useDelegations(token);

  // Get bootstrap status directly
  const { bootstrapStatus } = useBootstrapStatus();

  // State for delegation selection
  const [selectedDelegation, setSelectedDelegation] =
    useState<DelegationPerOperator | null>(null);

  // State for undelegation details
  // During bootstrap phase, only instant unbonding is supported
  const [isInstantUnbond, setIsInstantUnbond] = useState(false);

  // Update isInstantUnbond when bootstrapStatus changes
  useEffect(() => {
    if (bootstrapStatus !== undefined) {
      setIsInstantUnbond(!bootstrapStatus.isBootstrapped);
    }
  }, [bootstrapStatus]);

  // ✅ Safe approach: Derive the actual value used for operations
  // This ensures bootstrap phase always uses instant unbonding regardless of state
  const actualIsInstantUnbond = bootstrapStatus?.isBootstrapped
    ? isInstantUnbond // Post-bootstrap: use user's choice
    : true; // Bootstrap phase: always instant unbonding

  // Check if this is a native chain operation (not cross-chain)
  // This considers both bootstrap phase and token-specific requirements
  const isNativeChainOperation =
    !bootstrapStatus?.isBootstrapped ||
    !!token.network.connector?.requireExtraConnectToImua;

  // Get active delegations count
  const activeDelegationsCount = Array.from(
    delegationsData?.delegationsByOperator?.values() || [],
  ).filter((delegation) => delegation.delegated > BigInt(0)).length;

  // No need for complex loading state management - React Query handles this

  // Amount input with delegation constraint
  const maxAmount = selectedDelegation?.delegated || BigInt(0);
  const decimals = stakingService.tokenBalance.balance.decimals;
  const {
    amount,
    parsedAmount,
    error: amountError,
    setAmount,
  } = useAmountInput({
    decimals: decimals,
    maxAmount: maxAmount,
  });

  // Operation progress state
  const [showProgress, setShowProgress] = useState(false);
  const [operationSteps, setOperationSteps] = useState<OperationStep[]>([]);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);

  // Initialize operation steps based on operation mode
  useState(() => {
    let steps: OperationStep[] = [];

    if (isNativeChainOperation) {
      // Local mode: transaction, confirmation, completion (no approval needed)
      steps = [
        { ...transactionStep, description: "Sending undelegate transaction" },
        { ...confirmationStep },
        { ...completionStep },
      ];
    } else {
      // Cross-chain mode: transaction, confirmation, relay, completion
      steps = [
        { ...transactionStep, description: "Sending undelegate transaction" },
        { ...confirmationStep },
        {
          ...sendingRequestStep,
          description: `Relaying message to ${destinationChain}`,
        },
        { ...completionStep },
      ];
    }

    setOperationSteps(steps);
  });

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

  // Handle delegation selection
  const handleDelegationSelect = (delegation: DelegationPerOperator) => {
    setSelectedDelegation(delegation);
    setAmount(""); // Reset amount when delegation changes
    setShowDelegationModal(false);
    setCurrentStep("review");
  };

  // Handle continue to review
  const handleContinue = () => {
    if (selectedDelegation) {
      setCurrentStep("review");
    }
  };

  // Handle undelegation operation
  const handleUndelegate = async () => {
    if (!selectedDelegation || !parsedAmount) return;

    // Reset progress state
    setOperationSteps((prev) =>
      prev.map((step) => ({ ...step, status: "pending" })),
    );
    setShowProgress(true);

    try {
      const result = await stakingService.undelegateFrom(
        selectedDelegation.operatorAddress,
        parsedAmount,
        actualIsInstantUnbond,
        {
          onPhaseChange: handlePhaseChange,
        },
      );

      if (result.hash) {
        setTxHash(result.hash);
      }

      if (result.success) {
        // Mark the final step (verifying completion) as success
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
      console.error("Undelegation failed:", error);
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

    if (currentStep === "delegation") return "Continue";
    return "Undelegate";
  };

  // Get operator display name - use operatorName if available, fallback to address
  const getOperatorDisplayName = (
    delegation: DelegationPerOperator,
  ): string => {
    if (delegation.operatorName) {
      return delegation.operatorName;
    }
    return `${delegation.operatorAddress.slice(0, 8)}...${delegation.operatorAddress.slice(-6)}`;
  };

  // Calculate final amount (considering instant unbonding penalty)
  // During bootstrap phase, there's no penalty for instant unbonding
  const finalAmount =
    bootstrapStatus?.isBootstrapped && actualIsInstantUnbond && parsedAmount
      ? (parsedAmount * BigInt(75)) / BigInt(100) // 25% penalty for instant (post-bootstrap only)
      : parsedAmount;

  // Get unbonding period display text
  const getUnbondingPeriodText = (): string => {
    if (UNBOND_PERIOD) {
      const period = parseInt(UNBOND_PERIOD);
      if (period === 1) return "1 day";
      if (period < 7) return `${period} days`;
      if (period === 7) return "1 week";
      if (period < 30) return `${period} days`;
      if (period === 30) return "1 month";
      return `${period} days`;
    }
    return "7 days"; // fallback
  };

  // Create operation progress data
  const operationProgress = {
    operation: "undelegate",
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
      setCurrentStep("delegation");
      setAmount("");
      setSelectedDelegation(null);
      // ✅ Fix: Reset to correct initial value based on bootstrap status
      setIsInstantUnbond(!bootstrapStatus?.isBootstrapped);
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

  // Show loading when query is loading or when no data is available yet
  if (delegationsLoading || delegationsData === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5ff]"></div>
        <p className="ml-3 text-[#9999aa]">Loading delegations...</p>
      </div>
    );
  }

  // Show "No Active Delegations" when data is loaded but empty
  if (activeDelegationsCount === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-[#666677]/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-[#666677] text-2xl">📊</span>
        </div>
        <h3 className="text-xl font-semibold text-white mb-3">
          No Active Delegations
        </h3>
        <p className="text-[#9999aa] mb-6">
          You don&apos;t have any active delegations for this token.
        </p>
        <Button
          onClick={() => (window.location.href = "/staking")}
          className="bg-[#00e5ff] hover:bg-[#00b8cc] text-black font-medium"
        >
          Start Delegating
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step indicator - same as DelegateTab */}
      <div className="flex items-center justify-center mb-2">
        <div
          className={`flex items-center justify-center w-7 h-7 rounded-full ${
            currentStep === "delegation"
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

      {/* STEP 1: Delegation Selection - same pattern as DelegateTab Step 1 */}
      {currentStep === "delegation" && (
        <>
          {/* Available delegations display - same as DelegateTab's "Available for delegation" */}
          <div className="flex justify-between">
            <span className="text-sm text-[#9999aa]">
              Available delegations
            </span>
            <span className="text-sm font-medium text-white">
              {activeDelegationsCount} operator
              {activeDelegationsCount > 1 ? "s" : ""}
            </span>
          </div>

          {/* Delegation selection - same pattern as DelegateTab's amount input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-white">
                Select delegation to undelegate from
              </label>
            </div>

            <div
              className="w-full px-3 py-2 bg-[#15151c] border border-[#333344] rounded-md text-white cursor-pointer hover:border-[#00e5ff] transition-colors"
              onClick={() => setShowDelegationModal(true)}
            >
              {selectedDelegation ? (
                <div className="flex items-center justify-between">
                  <span>{getOperatorDisplayName(selectedDelegation)}</span>
                  <span className="text-[#00e5ff] text-sm">
                    {formatUnits(selectedDelegation.delegated, decimals)}{" "}
                    {token.symbol}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[#9999aa]">
                  <span>Click to select delegation</span>
                  <ChevronDown className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>

          {/* Continue button - same as DelegateTab */}
          <ActionButton
            className="w-full"
            variant="primary"
            size="lg"
            disabled={!selectedDelegation}
            onClick={handleContinue}
          >
            Continue
          </ActionButton>
        </>
      )}

      {/* STEP 2: Review - same pattern as DelegateTab Step 2 */}
      {currentStep === "review" && (
        <>
          <div className="space-y-4">
            {/* Transaction summary - same structure as DelegateTab */}
            <div className="p-4 bg-[#1a1a24] rounded-lg space-y-3">
              {/* Selected delegation - same as DelegateTab's "Selected operator" */}
              <div className="flex justify-between items-center">
                <span className="text-[#9999aa]">Delegation</span>
                <div className="flex items-center">
                  {selectedDelegation ? (
                    <>
                      <span className="text-white mr-2">
                        {getOperatorDisplayName(selectedDelegation)}
                      </span>
                      <button
                        className="text-xs text-[#00e5ff]"
                        onClick={() => setShowDelegationModal(true)}
                      >
                        Change
                      </button>
                    </>
                  ) : (
                    <button
                      className="text-[#00e5ff]"
                      onClick={() => setShowDelegationModal(true)}
                    >
                      Select
                    </button>
                  )}
                </div>
              </div>

              {/* Amount input - same pattern as DelegateTab's amount display */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-white">
                    Amount to undelegate
                  </label>
                  <button
                    className="text-xs font-medium text-[#00e5ff]"
                    onClick={() =>
                      setAmount(
                        formatUnits(
                          selectedDelegation?.delegated || BigInt(0),
                          decimals,
                        ),
                      )
                    }
                  >
                    MAX
                  </button>
                </div>

                <Input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#15151c] border border-[#333344] rounded-md text-white text-lg"
                  placeholder={`Max: ${formatUnits(selectedDelegation?.delegated || BigInt(0), decimals)} ${token.symbol}`}
                />

                {amountError && (
                  <p className="text-sm text-red-500">{amountError}</p>
                )}
              </div>

              {/* Unbonding type selection - conditional based on bootstrap status */}
              {bootstrapStatus?.isBootstrapped ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">
                    Unbonding type
                  </label>
                  <div className="flex space-x-2">
                    <button
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        !isInstantUnbond
                          ? "bg-[#4ade80] text-black"
                          : "bg-[#222233] text-[#9999aa] hover:bg-[#333344]"
                      }`}
                      onClick={() => setIsInstantUnbond(false)}
                    >
                      Wait {getUnbondingPeriodText()} (No penalty)
                    </button>
                    <button
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        isInstantUnbond
                          ? "bg-[#fbbf24] text-black"
                          : "bg-[#222233] text-[#9999aa] hover:bg-[#333344]"
                      }`}
                      onClick={() => setIsInstantUnbond(true)}
                    >
                      Instant (25% penalty)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">
                    Unbonding type
                  </label>
                  <div className="p-3 bg-[#0d2d1d] rounded-lg border border-[#4ade80]/20">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-[#4ade80] rounded-full"></div>
                      <span className="text-[#4ade80] font-medium text-sm">
                        Instant unbonding (No penalty)
                      </span>
                    </div>
                    <p className="text-xs text-[#86efac] mt-1">
                      During bootstrap phase, only instant unbonding is
                      supported with no penalty
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Final amount display for instant unbonding - only show penalty info for post-bootstrap */}
            {actualIsInstantUnbond &&
              parsedAmount &&
              parsedAmount > BigInt(0) &&
              bootstrapStatus?.isBootstrapped && (
                <div className="p-4 bg-[#0d2d1d] rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-[#fbbf24]">
                      Final Amount (after penalty)
                    </h4>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#86efac]">You will receive</span>
                    <span className="text-[#fbbf24] font-medium">
                      {formatUnits(finalAmount, decimals)} {token.symbol}
                    </span>
                  </div>
                </div>
              )}

            {/* Fee information - same as DelegateTab */}
            <div className="flex items-center text-xs text-[#9999aa] px-1">
              <Info size={12} className="mr-1 flex-shrink-0" />
              <span>No additional fees for this transaction</span>
            </div>
          </div>

          {/* Action buttons - same as DelegateTab */}
          <div className="flex space-x-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 border-[#333344] text-white hover:bg-[#222233]"
              onClick={() => setCurrentStep("delegation")}
            >
              Back
            </Button>

            <ActionButton
              className="flex-1"
              variant="primary"
              size="md"
              loading={showProgress}
              loadingText="Processing..."
              disabled={
                showProgress ||
                !selectedDelegation ||
                !!amountError ||
                !amount ||
                !parsedAmount ||
                parsedAmount === BigInt(0) ||
                parsedAmount > (selectedDelegation?.delegated || BigInt(0))
              }
              onClick={handleUndelegate}
            >
              {getButtonText()}
            </ActionButton>
          </div>
        </>
      )}

      {/* Simple Delegation Selection Modal - similar to OperatorSelectionModal */}
      {showDelegationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[#0f0f1a] border border-[#222233] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#222233]">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Select Delegation
                </h2>
                <p className="text-sm text-[#9999aa]">
                  Choose which delegation to undelegate from
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDelegationModal(false)}
                className="p-2 hover:bg-[#222233] text-[#9999aa]"
              >
                ✕
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {Array.from(
                  delegationsData?.delegationsByOperator?.values() || [],
                )
                  .filter((delegation) => delegation.delegated > BigInt(0))
                  .sort((a, b) => {
                    // Sort by delegation amount in descending order (highest first)
                    if (a.delegated > b.delegated) return -1;
                    if (a.delegated < b.delegated) return 1;
                    return 0;
                  })
                  .map((delegation) => (
                    <div
                      key={delegation.operatorAddress}
                      className="p-4 bg-[#1a1a24] border border-[#222233] rounded-xl hover:border-[#00e5ff]/50 hover:bg-[#1e1e2a] transition-all cursor-pointer group"
                      onClick={() => handleDelegationSelect(delegation)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-[#00e5ff] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-black font-bold text-sm">
                              {delegation.operatorName
                                ? delegation.operatorName
                                    .slice(0, 2)
                                    .toUpperCase()
                                : delegation.operatorAddress
                                    .slice(2, 4)
                                    .toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium group-hover:text-[#00e5ff] transition-colors">
                              {getOperatorDisplayName(delegation)}
                            </h4>
                            <p className="text-sm text-[#9999aa]">
                              {delegation.operatorName ? "Operator" : "Address"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-white font-medium">
                            {formatUnits(delegation.delegated, decimals)}{" "}
                            {token.symbol}
                          </p>
                          <p className="text-sm text-[#00e5ff]">
                            Available to undelegate
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
