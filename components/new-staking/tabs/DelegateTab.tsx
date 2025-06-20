// components/new-staking/tabs/DelegateTab.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAmountInput } from "@/hooks/useAmountInput";
import { TxStatus } from "@/types/staking";
import { formatUnits } from "viem";
import { Info, ChevronRight } from "lucide-react";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { OperationProgress } from "@/components/ui/operation-progress";
import { approvalStep, transactionStep, confirmationStep } from "@/components/ui/operation-progress";

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
  const stakingService = useStakingServiceContext();
  const token = stakingService.token;

  const maxAmount = stakingService.stakerBalance?.withdrawable || BigInt(0);
  const decimals = stakingService.walletBalance?.decimals || 0;
  const {
    amount,
    parsedAmount,
    error: amountError,
    setAmount,
  } = useAmountInput({ 
    decimals: decimals, 
    maxAmount: maxAmount 
  });

  // State for operator selection
  const [operatorAddress, setOperatorAddress] = useState("");
  const [showAdvancedOperatorSelection, setShowAdvancedOperatorSelection] = useState(false);
  const [recentOperators, setRecentOperators] = useState<
    Array<{ address: string; name: string; apy: number }>
  >([]);

  // Transaction state
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Operation progress tracking
  const [showProgress, setShowProgress] = useState(false);
  const [operationProgress, setOperationProgress] = useState<OperationProgress>({
    operation: "delegate",
    steps: [
      approvalStep,
      transactionStep,
      confirmationStep,
    ],
    currentStepIndex: 0,
    overallStatus: null,
  });

  // Fetch recent operators on component mount
  useEffect(() => {
    // In a real implementation, this would fetch from API or local storage
    setRecentOperators([
      { address: "0x1234...5678", name: "Operator Alpha", apy: 5.2 },
      { address: "0x5678...9abc", name: "Operator Beta", apy: 4.8 },
      { address: "0x9abc...def0", name: "Operator Gamma", apy: 5.5 },
      { address: "0xdef0...1234", name: "Operator Delta", apy: 4.6 },
      { address: "0x2345...6789", name: "Operator Epsilon", apy: 5.7 },
    ]);

    // Try to restore last used operator from localStorage
    const lastOperator = localStorage.getItem(`lastDelegateOperator_${token.symbol}`);
    if (lastOperator) {
      setOperatorAddress(lastOperator);
    }
  }, [token.symbol]);

  // Handle delegation operation
  const handleOperation = async () => {
    setTxError(null);
    setTxStatus("processing");
    setShowProgress(true);

    try {
      const result = await stakingService.delegateTo(
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

    // Save selected operator to localStorage
    if (address) {
      localStorage.setItem(`lastDelegateOperator_${token.symbol}`, address);
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
            Delegate {token.symbol}
          </h2>
        </div>
      </div>

      {/* Available balance display */}
      <div className="flex justify-between">
        <span className="text-sm text-[#9999aa]">
          Available for delegation
        </span>
        <span className="text-sm font-medium text-white">
          {formatUnits(maxAmount, decimals)} {token.symbol}
        </span>
      </div>

      {/* Operator selection */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-white">
            Select Operator
          </h3>

          <button
            className="text-xs flex items-center text-[#00e5ff]"
            onClick={() => setShowAdvancedOperatorSelection(!showAdvancedOperatorSelection)}
          >
            {showAdvancedOperatorSelection ? (
              <>
                Quick Selection <ChevronRight size={14} className="ml-1" />
              </>
            ) : (
              <>
                Advanced Selection <ChevronRight size={14} className="ml-1" />
              </>
            )}
          </button>
        </div>

        {/* Quick Selection Mode */}
        {!showAdvancedOperatorSelection ? (
          <div className="space-y-3">
            {recentOperators.map((operator) => (
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
                  <div className="font-bold text-[#00e5ff]">
                    {operator.apy}% APY
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Advanced Selection Mode (simplified)
          <div className="border border-[#333344] rounded-lg p-4">
            <div className="text-center mb-4">
              <h4 className="font-medium text-white mb-2">
                Advanced Operator Selection
              </h4>
              <p className="text-sm text-[#9999aa]">
                Compare and select from all available operators
              </p>
            </div>

            <div className="text-center text-[#9999aa] p-6 border border-dashed border-[#333344] rounded">
              Full OperatorsList component would be rendered here
            </div>
          </div>
        )}
      </div>

      {/* Amount input */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium text-[#ddddee]">
            Amount to delegate
          </label>
          <button
            className="text-xs font-medium text-[#00e5ff]"
            onClick={() => setAmount(formatUnits(maxAmount, decimals))}
          >
            MAX
          </button>
        </div>

        <Input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 bg-[#15151c] border border-[#333344] rounded-md text-white"
          placeholder={`Enter amount (max: ${formatUnits(maxAmount, decimals)} ${token.symbol})`}
        />

        {amountError && (
          <p className="text-sm text-red-500">{amountError}</p>
        )}
      </div>

      {/* Estimated rewards section */}
      {operatorAddress && parsedAmount && parsedAmount > BigInt(0) && (
        <div className="p-4 bg-[#0d2d1d] rounded-lg">
          <h4 className="font-medium text-[#4ade80] mb-2">
            Estimated Rewards
          </h4>
          <div className="flex justify-between text-sm">
            <span className="text-[#86efac]">
              Annual Percentage Yield:
            </span>
            <span className="font-bold text-[#4ade80]">
              {recentOperators.find(op => op.address === operatorAddress)?.apy || 0}%
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-[#86efac]">
              Estimated yearly rewards:
            </span>
            <span className="font-bold text-[#4ade80]">
              {(Number(formatUnits(parsedAmount, decimals)) * 
                (recentOperators.find(op => op.address === operatorAddress)?.apy || 0) / 100).toFixed(2)} {token.symbol}
            </span>
          </div>
        </div>
      )}

      {/* Action button */}
      <Button
        className="w-full py-3 bg-[#00e5ff] hover:bg-[#00e5ff]/90 text-black font-medium"
        disabled={
          (!!txStatus && txStatus !== "error") ||
          !!amountError ||
          !amount ||
          !parsedAmount ||
          parsedAmount === BigInt(0) ||
          !operatorAddress
        }
        onClick={handleOperation}
      >
        {txStatus === "processing"
          ? "Processing..."
          : txStatus === "success"
            ? "Success!"
            : txStatus === "error"
              ? "Failed!"
              : "Delegate"}
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