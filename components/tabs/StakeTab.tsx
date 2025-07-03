// components/new-staking/tabs/StakeTab.tsx
import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAmountInput } from "@/hooks/useAmountInput";
import { TxStatus } from "@/types/staking";
import { formatUnits } from "viem";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CrossChainProgress } from "@/components/ui/cross-chain-progress";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { useOperatorsContext } from "@/contexts/OperatorsContext";
import { OperatorSelectionModal } from "@/components/modals/OperatorSelectionModal";
import { OperatorInfo } from "@/types/operator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

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
  const { operators } = useOperatorsContext();

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

  // Staking mode state
  const [isStakeMode, setIsStakeMode] = useState(true);
  const [selectedOperator, setSelectedOperator] = useState<OperatorInfo | null>(
    null,
  );

  // Check if deposit-then-delegate is disabled for this token
  const isDepositThenDelegateDisabled =
    !!stakingService.isDepositThenDelegateDisabled;

  // Transaction state
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);

  // Cross-chain progress tracking
  const [showProgress, setShowProgress] = useState(false);

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
    if (isStakeMode && !isDepositThenDelegateDisabled) {
      setShowOperatorModal(true);
    } else {
      setCurrentStep("review");
    }
  };

  // Handle stake/deposit operation
  const handleOperation = async () => {
    setTxError(null);
    setTxStatus("approving");
    setShowProgress(true);

    try {
      const result = await stakingService.stake(
        parsedAmount,
        isStakeMode && !isDepositThenDelegateDisabled && selectedOperator
          ? selectedOperator.address
          : undefined,
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
        setTxError("Transaction rejected by the user Or Transaction failed");
      }
    } catch (error) {
      console.error("Operation failed:", error);
      setTxStatus("error");
      setTxError("Transaction rejected by the user Or Transaction failed");
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

    if (isDepositThenDelegateDisabled) return "Deposit";
    return isStakeMode ? "Stake" : "Deposit";
  };

  // Calculate estimated rewards (if applicable)
  const calculateEstimatedRewards = () => {
    if (!selectedOperator || !parsedAmount) return "0";

    const amountNumber = Number(formatUnits(parsedAmount, decimals));
    const yearlyRewards = amountNumber * (selectedOperator.apr / 100);

    return yearlyRewards;
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

          {/* Stake mode toggle - simplified */}
          {!isDepositThenDelegateDisabled && (
            <div className="flex items-center justify-between p-3 bg-[#1a1a24] rounded-lg">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isStakeMode}
                  onCheckedChange={(value) => setIsStakeMode(value)}
                  id="stake-mode"
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
              {isStakeMode && !isDepositThenDelegateDisabled && (
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
                (isStakeMode &&
                  !isDepositThenDelegateDisabled &&
                  !selectedOperator) ||
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

      {/* Progress overlay */}
      <CrossChainProgress
        sourceChain={sourceChain}
        destinationChain={destinationChain}
        operation={isStakeMode && selectedOperator ? "stake" : "deposit"}
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
    </div>
  );
}
