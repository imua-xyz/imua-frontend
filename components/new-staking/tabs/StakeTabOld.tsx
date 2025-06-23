// components/new-staking/tabs/StakeTab.tsx
import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAmountInput } from "@/hooks/useAmountInput";
import { TxStatus } from "@/types/staking";
import { formatUnits } from "viem";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CrossChainProgress } from "@/components/ui/crosschain-progress";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { approvalStep, transactionStep, confirmationStep, relayingStep, completionStep } from "@/components/ui/operation-progress";
import { useOperatorsContext } from "@/contexts/OperatorsContext";

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
  const stakingService = useStakingServiceContext();
  const token = stakingService.token;
  const { operators, isLoading, error } = useOperatorsContext();

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

  // State for operator selection
  const [isStakeMode, setIsStakeMode] = useState(true);
  const [operatorAddress, setOperatorAddress] = useState("");
  const [showAdvancedOperatorSelection, setShowAdvancedOperatorSelection] =
    useState(false);
  const [recentOperators, setRecentOperators] = useState<
    Array<{ address: string; name: string; apy: number }>
  >([]);

  // Transaction state
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Check if deposit-then-delegate is disabled for this token
  const isDepositThenDelegateDisabled =
    !!stakingService.isDepositThenDelegateDisabled;

  // Cross-chain progress tracking
  const [showProgress, setShowProgress] = useState(false);
  const [crossChainProgress, setCrossChainProgress] =
    useState<CrossChainProgress>({
      sourceChain,
      destinationChain,
      operation: isStakeMode && operatorAddress ? "stake" : "deposit",
      steps: [
        approvalStep,
        transactionStep,
        confirmationStep,
        relayingStep,
        completionStep,
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
    const lastOperator = localStorage.getItem(`lastOperator_${token.symbol}`);
    if (lastOperator) {
      setOperatorAddress(lastOperator);
    }
  }, [token.symbol]);

  // Other effects and handlers remain the same

  // Handle stake/deposit operation
  const handleOperation = async () => {
    setTxError(null);
    setTxStatus("approving");
    setShowProgress(true);

    try {
      // In a real implementation, this would call the stakingProvider methods
      const result = await stakingService.stake(
        parsedAmount,
        isStakeMode && !isDepositThenDelegateDisabled
          ? operatorAddress || undefined
          : undefined,
        {
          onStatus: (status, error) => {
            setTxStatus(status);
            if (error) setTxError(error);
          },
        },
      );

      if (result.success) {
        setTxStatus("success");
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
    if (isDepositThenDelegateDisabled) return;

    setOperatorAddress(address);

    // Save selected operator to localStorage
    if (address) {
      localStorage.setItem(`lastOperator_${token.symbol}`, address);
    }

    // Update operation type in progress tracking
    setCrossChainProgress((prev) => ({
      ...prev,
      operation: isStakeMode && address ? "stake" : "deposit",
    }));
  };

  // Format button text based on state
  const getButtonText = () => {
    if (txStatus === "approving") return "Approving...";
    if (txStatus === "processing") return "Processing...";
    if (txStatus === "success") return "Success!";
    if (txStatus === "error") return "Failed!";

    if (isDepositThenDelegateDisabled) return "Deposit";
    return isStakeMode && operatorAddress ? "Stake" : "Deposit";
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
            {isStakeMode && operatorAddress ? "Stake" : "Deposit"} {token.symbol}
          </h2>
        </div>
      </div>

      {/* Balance display */}
      <div className="flex justify-between">
        <span className="text-sm text-[#9999aa]">
          Your balance
        </span>
        <span className="text-sm font-medium text-white">
          {formatUnits(balance, token.decimals)} {token.symbol}
        </span>
      </div>

      {/* Amount input */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium text-[#ddddee]">
            Amount to {isStakeMode && operatorAddress ? "stake" : "deposit"}
          </label>
          <button
            className="text-xs font-medium text-[#00e5ff]"
            onClick={() => setAmount(formatUnits(balance, token.decimals))}
          >
            MAX
          </button>
        </div>

        <Input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 bg-[#15151c] border border-[#333344] rounded-md text-white"
          placeholder={`Enter amount (min: ${stakingService.minimumStakeAmount ? formatUnits(stakingService.minimumStakeAmount, token.decimals) : "0"})`}
        />

        {amountError && (
          <p className="text-sm text-red-500">{amountError}</p>
        )}

        {/* Estimated value in USD if available */}
        {parsedAmount && parsedAmount > BigInt(0) && (
          <div className="text-xs text-right text-[#9999aa]">
            ≈ ${(Number(formatUnits(parsedAmount, token.decimals)) * 1200).toLocaleString()}
          </div>
        )}
      </div>

      {/* Stake mode toggle (if deposit-then-delegate is allowed) */}
      {!isDepositThenDelegateDisabled && (
        <div className="flex items-center justify-between p-3 bg-[#222233] rounded-lg">
          <div className="flex items-center space-x-2">
            <Switch
              checked={isStakeMode}
              onCheckedChange={(value) => setIsStakeMode(value)}
              id="stake-mode"
            />
            <Label
              htmlFor="stake-mode"
              className="font-medium text-white"
            >
              Stake & Earn Rewards
            </Label>
          </div>

          <div className="flex items-center text-xs text-[#9999aa]">
            <Info size={14} className="mr-1" />
            {isStakeMode ? "Select an operator below" : "Deposit only"}
          </div>
        </div>
      )}

      {/* Operator selection (if in stake mode and deposit-then-delegate allowed) */}
      {isStakeMode && !isDepositThenDelegateDisabled && (
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
      )}

      {/* Estimated rewards section */}
      {isStakeMode && operatorAddress && parsedAmount && parsedAmount > BigInt(0) && (
        <div className="p-4 bg-[#0d2d1d] rounded-lg">
          <h4 className="font-medium text-[#4ade80] mb-2">
            Estimated Rewards
          </h4>
          <div className="flex justify-between text-sm">
            <span className="text-[#86efac]">
              Annual Percentage Yield:
            </span>
            <span className="font-bold text-[#4ade80]">
              {3}%
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-[#86efac]">
              Estimated yearly rewards:
            </span>
            <span className="font-bold text-[#4ade80]">
              {100.82} {token.symbol}
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
          parsedAmount === BigInt(0)
        }
        onClick={handleOperation}
      >
        {getButtonText()}
      </Button>

      {txError && (
        <p className="mt-3 text-sm text-red-500">{txError}</p>
      )}

      {/* Progress overlay would still use a modal */}
      <CrossChainProgress
        txStatus={txStatus}
        progress={crossChainProgress}
        open={showProgress}
        onClose={() => {
          // Only allow closing if complete or error
          if (
            crossChainProgress.overallStatus === "success" ||
            crossChainProgress.overallStatus === "error"
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