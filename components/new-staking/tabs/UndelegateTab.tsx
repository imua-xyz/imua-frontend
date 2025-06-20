// components/new-staking/tabs/UndelegateTab.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAmountInput } from "@/hooks/useAmountInput";
import { TxStatus } from "@/types/staking";
import { formatUnits } from "viem";
import { Info, ChevronRight, AlertTriangle } from "lucide-react";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { OperationProgress } from "@/components/ui/operation-progress";
import { transactionStep, confirmationStep, completionStep } from "@/components/ui/operation-progress";

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
  const stakingService = useStakingServiceContext();
  const token = stakingService.token;

  const decimals = stakingService.walletBalance?.decimals || 0;
  const maxAmount = stakingService.stakerBalance?.delegated || BigInt(0);
  const {
    amount,
    parsedAmount,
    error: amountError,
    setAmount,
  } = useAmountInput({
    decimals: decimals,
    maxAmount: maxAmount,
  });

  // State for operator selection
  const [operatorAddress, setOperatorAddress] = useState("");
  const [showOperatorList, setShowOperatorList] = useState(false);
  const [delegatedOperators, setDelegatedOperators] = useState<
    Array<{ address: string; name: string; amount: bigint; formattedAmount: string }>
  >([]);

  // Transaction state
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Operation progress tracking
  const [showProgress, setShowProgress] = useState(false);
  const [operationProgress, setOperationProgress] = useState<OperationProgress>({
    operation: "undelegate",
    steps: [
      transactionStep,
      confirmationStep,
      completionStep,
    ],
    currentStepIndex: 0,
    overallStatus: null,
  });

  // Fetch delegated operators on component mount
  useEffect(() => {
    // In a real implementation, this would fetch from API based on user's actual delegations
    setDelegatedOperators([
      { 
        address: "0x1234...5678", 
        name: "Operator Alpha", 
        amount: BigInt(5000000000000000000), 
        formattedAmount: "5.0" 
      },
      { 
        address: "0x5678...9abc", 
        name: "Operator Beta", 
        amount: BigInt(3200000000000000000), 
        formattedAmount: "3.2" 
      },
      { 
        address: "0x9abc...def0", 
        name: "Operator Gamma", 
        amount: BigInt(7500000000000000000), 
        formattedAmount: "7.5" 
      },
    ]);
  }, [token.symbol]);

  // Handle undelegation operation
  const handleOperation = async () => {
    setTxError(null);
    setTxStatus("processing");
    setShowProgress(true);

    try {
      // Update progress for transaction submission
      setOperationProgress(prev => ({
        ...prev,
        currentStepIndex: 0,
        steps: prev.steps.map((step, idx) => ({
          ...step,
          status: idx === 0 ? "processing" : "pending"
        })),
        overallStatus: "processing"
      }));

      const result = await stakingService.undelegateFrom(
        operatorAddress, 
        parsedAmount, 
        {
          onStatus: (status, error) => {
            setTxStatus(status);
            if (error) setTxError(error);
            
            // Update progress based on transaction status
            setOperationProgress(prev => {
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
                  
                  // Move to completion step after a delay
                  setTimeout(() => {
                    setOperationProgress(prev => ({
                      ...prev,
                      currentStepIndex: 2,
                      steps: prev.steps.map((step, idx) => ({
                        ...step,
                        status: idx <= 2 ? "success" : step.status
                      })),
                      overallStatus: "success"
                    }));
                  }, 2000);
                  
                  break;
                  
                case "error":
                  const processingIndex = updatedProgress.steps.findIndex(
                    (step) => step.status === "processing"
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
        }
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

  // Handle operator selection
  const handleOperatorSelect = (address: string) => {
    setOperatorAddress(address);
    
    // Optionally set amount to max delegated for this operator
    const selectedOperator = delegatedOperators.find(op => op.address === address);
    if (selectedOperator) {
      setAmount(selectedOperator.formattedAmount);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Token Info */}
      <div className="flex items-center">
        <img
          src={token.iconUrl}
          alt={token.symbol}
          className="w-24 h-6 mr-3"
        />
        <div>
          <h2 className="text-lg font-bold text-white">
            Undelegate {token.symbol}
          </h2>
        </div>
      </div>

      {/* Total delegated amount display */}
      <div className="flex justify-between">
        <span className="text-sm text-[#9999aa]">
          Total delegated
        </span>
        <span className="text-sm font-medium text-white">
          {formatUnits(maxAmount, decimals)} {token.symbol}
        </span>
      </div>

      {/* Operator selection */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-white">
            Select Delegated Operator
          </h3>
        </div>

        {maxAmount > BigInt(0) ? (
          <div className="space-y-3">
            {delegatedOperators.map((operator) => (
              <div
                key={operator.address}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  operatorAddress === operator.address
                    ? "border-[#00e5ff] bg-[#00e5ff]/10"
                    : "border-[#333344] hover:bg-[#222233]"
                } cursor-pointer transition-colors`}
                onClick={() => handleOperatorSelect(operator.address)}
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-[#333344] flex items-center justify-center text-xs mr-3">
                    {operator.name.substring(0, 2)}
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {operator.name}
                    </div>
                    <div className="text-xs text-[#9999aa]">
                      {operator.address.substring(0, 6)}...
                      {operator.address.substring(operator.address.length - 4)}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-medium text-white">
                    {operator.formattedAmount} {token.symbol}
                  </div>
                  <div className="text-xs text-[#9999aa]">
                    Delegated
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-[#333344] bg-[#1a1a24]">
            <div className="flex items-center justify-center gap-2 text-[#9999aa]">
              <AlertTriangle size={16} />
              <span>You don't have any delegated tokens</span>
            </div>
          </div>
        )}
      </div>

      {/* Amount input */}
      {operatorAddress && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-[#ddddee]">
              Amount to undelegate
            </label>
            <button
              className="text-xs font-medium text-[#00e5ff]"
              onClick={() => {
                const selectedOperator = delegatedOperators.find(op => op.address === operatorAddress);
                if (selectedOperator) {
                  setAmount(selectedOperator.formattedAmount);
                }
              }}
            >
              MAX
            </button>
          </div>

          <Input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 bg-[#15151c] border border-[#333344] rounded-md text-white"
            placeholder={`Enter amount (max: ${
              delegatedOperators.find(op => op.address === operatorAddress)?.formattedAmount || "0"
            } ${token.symbol})`}
          />

          {amountError && (
            <p className="text-sm text-red-500">{amountError}</p>
          )}
        </div>
      )}

      {/* Unbonding period notice */}
      <div className="p-4 bg-[#1a1a24] rounded-lg border border-[#333344]">
        <div className="flex items-start">
          <Info size={18} className="text-[#9999aa] mr-2 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-white mb-1">
              Unbonding Period
            </h4>
            <p className="text-xs text-[#9999aa]">
              Undelegated tokens will be subject to a 21-day unbonding period before they can be withdrawn.
              During this period, tokens will not earn staking rewards.
            </p>
          </div>
        </div>
      </div>

      {/* Action button */}
      <Button
        className="w-full py-3 bg-[#00e5ff] hover:bg-[#00e5ff]/90 text-black font-medium"
        disabled={
          (!!txStatus && txStatus !== "error") ||
          !!amountError ||
          !amount ||
          !parsedAmount ||
          parsedAmount === BigInt(0) ||
          !operatorAddress ||
          maxAmount === BigInt(0)
        }
        onClick={handleOperation}
      >
        {txStatus === "processing"
          ? "Processing..."
          : txStatus === "success"
            ? "Success!"
            : txStatus === "error"
              ? "Failed!"
              : "Undelegate"}
      </Button>

      {txError && (
        <p className="mt-3 text-sm text-red-500">{txError}</p>
      )}

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