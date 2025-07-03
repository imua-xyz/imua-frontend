// components/new-staking/tabs/DelegateTab.tsx
import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAmountInput } from "@/hooks/useAmountInput";
import { TxStatus } from "@/types/staking";
import { formatUnits } from "viem";
import { CrossChainProgress } from "@/components/ui/cross-chain-progress";
import { NativeChainProgress } from "@/components/ui/native-chain-progress";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { useOperatorsContext } from "@/contexts/OperatorsContext";
import { OperatorSelectionModal } from "@/components/modals/OperatorSelectionModal";
import { OperatorInfo } from "@/types/operator";

interface DelegateTabProps {
  sourceChain: string;
  destinationChain: string;
  onSuccess?: () => void;
}

export function DelegateTab({
  sourceChain,
  destinationChain,
  onSuccess,
}: DelegateTabProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState<"amount" | "review">("amount");
  const [showOperatorModal, setShowOperatorModal] = useState(false);

  // Context hooks
  const stakingService = useStakingServiceContext();
  const token = stakingService.token;
  const { operators } = useOperatorsContext();

  // Check if this is a native chain operation (not cross-chain)
  const isNativeChainOperation = !!token.connector?.requireExtraConnectToImua;

  // Balance and amount state
  const maxAmount = stakingService.stakerBalance?.claimable || BigInt(0);
  const decimals = stakingService.walletBalance?.decimals || 0;
  const {
    amount,
    parsedAmount,
    error: amountError,
    setAmount,
  } = useAmountInput({
    decimals: decimals,
    maxAmount: maxAmount,
  });

  const [selectedOperator, setSelectedOperator] = useState<OperatorInfo | null>(
    null,
  );

  // Transaction state
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);

  // Progress tracking
  const [showProgress, setShowProgress] = useState(false);

  // Try to restore last used operator from localStorage
  useEffect(() => {
    if (operators && operators.length > 0) {
      const lastOperatorAddress = localStorage.getItem(
        `lastDelegateOperator_${token.symbol}`,
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

  // Handle continue button click - now just opens operator modal
  const handleContinue = () => {
    setShowOperatorModal(true);
  };

  // Handle operator selection
  const handleOperatorSelect = (operator: OperatorInfo) => {
    setSelectedOperator(operator);

    // Save selected operator to localStorage
    localStorage.setItem(
      `lastDelegateOperator_${token.symbol}`,
      operator.address,
    );

    // Close the modal
    setShowOperatorModal(false);

    // Move to review step
    setCurrentStep("review");
  };

  // Handle delegation operation
  const handleOperation = async () => {
    if (!selectedOperator) return;

    setTxError(null);
    setTxStatus("processing");
    setShowProgress(true);

    try {
      const result = await stakingService.delegateTo(
        selectedOperator.address,
        parsedAmount,
        {
          onStatus: (status, error) => {
            setTxStatus(status);
            if (error) setTxError(error);
          },
        },
      );

      if (result.hash) {
        setTxHash(result.hash);
      }

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

    setTimeout(() => {
      setTxStatus(null);
      setTxError(null);
      setTxHash(undefined);
    }, 1000);
  };

  // Format button text based on state
  const getButtonText = () => {
    if (txStatus === "approving") return "Approving...";
    if (txStatus === "processing") return "Processing...";
    if (txStatus === "success") return "Success!";
    if (txStatus === "error") return "Failed!";

    if (currentStep === "amount") return "Continue";
    return "Delegate";
  };

  // Calculate estimated rewards
  const calculateEstimatedRewards = () => {
    if (!selectedOperator || !parsedAmount) return "0";

    const amountNumber = Number(formatUnits(parsedAmount, decimals));
    const yearlyRewards = amountNumber * (selectedOperator.apr / 100);

    return yearlyRewards.toFixed(2);
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
          {/* Available balance display */}
          <div className="flex justify-between">
            <span className="text-sm text-[#9999aa]">
              Available for delegation
            </span>
            <span className="text-sm font-medium text-white">
              {formatUnits(maxAmount, decimals)} {token.symbol}
            </span>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-white">
                Amount to delegate
              </label>
              <div className="flex items-center space-x-2 text-xs text-[#9999aa]">
                <button
                  className="text-xs font-medium text-[#00e5ff] ml-1"
                  onClick={() => setAmount(formatUnits(maxAmount, decimals))}
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

          {/* Continue button - now only requires valid amount */}
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

      {/* STEP 2: Review */}
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

              {/* Selected operator */}
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
            </div>

            {/* Estimated rewards section */}
            {selectedOperator && parsedAmount && parsedAmount > BigInt(0) && (
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

            {/* Fee information - more subtle */}
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
                !!txStatus ||
                !selectedOperator ||
                !parsedAmount ||
                parsedAmount === BigInt(0)
              }
              onClick={handleOperation}
            >
              {getButtonText()}
            </Button>
          </div>

          {txError && <p className="mt-3 text-sm text-red-500">{txError}</p>}
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

      {/* Progress overlay - conditionally render based on token connector */}
      {isNativeChainOperation ? (
        <NativeChainProgress
          chain={sourceChain}
          operation="delegate"
          txHash={txHash}
          explorerUrl={token.network.txExplorerUrl}
          txStatus={txStatus}
          open={showProgress}
          onClose={() => {
            setShowProgress(false);
          }}
          onViewDetails={() => {
            if (token.network.txExplorerUrl && txHash) {
              window.open(`${token.network.txExplorerUrl}${txHash}`, "_blank");
            }
          }}
        />
      ) : (
        <CrossChainProgress
          sourceChain={sourceChain}
          destinationChain={destinationChain}
          operation="delegate"
          txHash={txHash}
          explorerUrl={token.network.txExplorerUrl}
          txStatus={txStatus}
          open={showProgress}
          onClose={() => {
            setShowProgress(false);
          }}
          onViewDetails={() => {
            if (token.network.txExplorerUrl && txHash) {
              window.open(`${token.network.txExplorerUrl}${txHash}`, "_blank");
            }
          }}
        />
      )}
    </div>
  );
}
