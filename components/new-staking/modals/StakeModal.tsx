// components/new-staking/modals/StakeModal.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
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
import { CrossChainProgress } from "@/components/ui/cross-chain-progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Token } from "@/types/tokens";
import { StakingService } from "@/types/staking-service";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceChain: string;
  destinationChain: string;
  onSuccess?: () => void;
}

export function StakeModal({
  isOpen,
  onClose,
  sourceChain,
  destinationChain,
  onSuccess,
}: StakeModalProps) {
  const stakingService = useStakingServiceContext();
  const token = stakingService.token;

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
        {
          id: "approval",
          title: "Token Approval",
          description: "Approve tokens for staking",
          status: "pending",
        },
        {
          id: "transaction",
          title: "Submit Transaction",
          description: `Sending ${isStakeMode && operatorAddress ? "stake" : "deposit"} transaction`,
          status: "pending",
        },
        {
          id: "confirmation",
          title: "Transaction Confirmation",
          description: "Waiting for transaction to be confirmed",
          status: "pending",
        },
        {
          id: "relaying",
          title: "Cross-Chain Message",
          description: `Relaying message to ${destinationChain}`,
          status: "pending",
        },
        {
          id: "completion",
          title: "Process Completion",
          description: "Verifying final balance update",
          status: "pending",
        },
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

  // Update cross-chain progress based on transaction status
  useEffect(() => {
    if (!txStatus) return;

    setCrossChainProgress((prev) => {
      const updatedProgress = { ...prev };

      switch (txStatus) {
        case "approving":
          updatedProgress.currentStepIndex = 0;
          updatedProgress.steps[0].status = "processing";
          updatedProgress.overallStatus = "approving";
          break;

        case "processing":
          if (updatedProgress.steps[0].status === "processing") {
            updatedProgress.steps[0].status = "success";
          }
          updatedProgress.currentStepIndex = 1;
          updatedProgress.steps[1].status = "processing";
          updatedProgress.overallStatus = "processing";
          break;

        case "success":
          updatedProgress.steps[0].status = "success"; // Approval
          updatedProgress.steps[1].status = "success"; // Transaction
          updatedProgress.currentStepIndex = 2;
          updatedProgress.steps[2].status = "success"; // Confirmation
          updatedProgress.currentStepIndex = 3;
          updatedProgress.steps[3].status = "processing"; // Now relaying
          updatedProgress.overallStatus = "relaying";
          break;

        case "error":
          const processingIndex = updatedProgress.steps.findIndex(
            (step) => step.status === "processing",
          );

          if (processingIndex >= 0) {
            updatedProgress.steps[processingIndex].status = "error";
          }
          updatedProgress.overallStatus = "error";
          break;
      }

      return updatedProgress;
    });

    // For the success case, simulate cross-chain completion
    if (txStatus === "success") {
      const timeoutId = setTimeout(() => {
        setCrossChainProgress((prev) => {
          const updated = { ...prev };
          updated.steps[3].status = "success"; // Relay complete
          updated.currentStepIndex = 4;
          updated.steps[4].status = "processing"; // Verifying completion
          updated.overallStatus = "confirming";
          return updated;
        });

        const innerTimeoutId = setTimeout(() => {
          setCrossChainProgress((prev) => {
            const final = { ...prev };
            final.steps[4].status = "success";
            final.overallStatus = "success";
            return final;
          });

          // Trigger onSuccess callback after completion
          if (onSuccess) {
            setTimeout(onSuccess, 1000);
          }
        }, 3000);

        return () => clearTimeout(innerTimeoutId);
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [txStatus, onSuccess]);

  // Handle toggle between Stake and Deposit mode
  const handleModeToggle = (value: boolean) => {
    setIsStakeMode(value);

    // Update operation type in progress tracking
    setCrossChainProgress((prev) => ({
      ...prev,
      operation: value && operatorAddress ? "stake" : "deposit",
    }));
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

  // Handle stake/deposit operation
  const handleOperation = async () => {
    setTxError(null);
    setTxStatus("approving");
    setShowProgress(true);

    try {
      // In a real implementation, this would call the stakingProvider methods
      const result = await stakingService.stake(
        parsedAmount,
        stakingService.vaultAddress as `0x${string}`,
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

  // Handle progress dialog close
  const handleCloseProgress = () => {
    // Only allow closing if complete or error
    if (
      crossChainProgress.overallStatus === "success" ||
      crossChainProgress.overallStatus === "error"
    ) {
      setShowProgress(false);

      // Reset progress for next operation
      setTimeout(() => {
        setTxStatus(null);
        setTxError(null);
        setCrossChainProgress((prev) => ({
          ...prev,
          steps: prev.steps.map((step) => ({ ...step, status: "pending" })),
          currentStepIndex: 0,
          overallStatus: null,
        }));

        // If successful, close the modal
        if (crossChainProgress.overallStatus === "success") {
          onClose();
        }
      }, 500);
    }
  };

  // Calculate estimated APY and rewards
  const estimatedApy = operatorAddress
    ? recentOperators.find((op) => op.address === operatorAddress)?.apy || 0
    : Math.max(...recentOperators.map((op) => op.apy), 0);

  const estimatedYearlyRewards = parsedAmount
    ? (Number(formatUnits(parsedAmount, token.decimals)) * estimatedApy) / 100
    : 0;

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-[#15151c] rounded-xl w-full max-w-lg shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-6 border-b border-gray-200 dark:border-gray-800 flex items-center">
              <div className="flex items-center">
                <img
                  src={token.iconUrl}
                  alt={token.symbol}
                  className="w-40 h-10 mr-3"
                />
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {isStakeMode && operatorAddress ? "Stake" : "Deposit"}{" "}
                    {token.symbol}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {token.name}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Balance display */}
              <div className="flex justify-between mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Your balance
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatUnits(balance, token.decimals)} {token.symbol}
                </span>
              </div>

              {/* Amount input */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount to{" "}
                    {isStakeMode && operatorAddress ? "stake" : "deposit"}
                  </label>
                  <button
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400"
                    onClick={() =>
                      setAmount(formatUnits(balance, token.decimals))
                    }
                  >
                    MAX
                  </button>
                </div>

                <Input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                  placeholder={`Enter amount (min: ${stakingService.minimumStakeAmount ? formatUnits(stakingService.minimumStakeAmount, token.decimals) : "0"})`}
                />

                {amountError && (
                  <p className="text-sm text-red-500">{amountError}</p>
                )}

                {/* Estimated value in USD if available */}
                {parsedAmount && parsedAmount > BigInt(0) && (
                  <div className="text-xs text-right text-gray-500 dark:text-gray-400">
                    ≈ $
                    {(
                      Number(formatUnits(parsedAmount, token.decimals)) * 1200
                    ).toLocaleString()}{" "}
                    {/* Placeholder price */}
                  </div>
                )}
              </div>

              {/* Stake mode toggle (if deposit-then-delegate is allowed) */}
              {!isDepositThenDelegateDisabled && (
                <div className="flex items-center justify-between p-3 mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={isStakeMode}
                      onCheckedChange={handleModeToggle}
                      id="stake-mode"
                    />
                    <Label
                      htmlFor="stake-mode"
                      className="font-medium text-gray-700 dark:text-gray-300"
                    >
                      Stake & Earn Rewards
                    </Label>
                  </div>

                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Info size={14} className="mr-1" />
                    {isStakeMode ? "Select an operator below" : "Deposit only"}
                  </div>
                </div>
              )}

              {/* Operator selection (if in stake mode and deposit-then-delegate allowed) */}
              {isStakeMode && !isDepositThenDelegateDisabled && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select Operator
                    </h3>

                    <button
                      className="text-xs flex items-center text-indigo-600 dark:text-indigo-400"
                      onClick={() =>
                        setShowAdvancedOperatorSelection(
                          !showAdvancedOperatorSelection,
                        )
                      }
                    >
                      {showAdvancedOperatorSelection ? (
                        <>
                          Quick Selection{" "}
                          <ChevronRight size={14} className="ml-1" />
                        </>
                      ) : (
                        <>
                          Advanced Selection{" "}
                          <ChevronRight size={14} className="ml-1" />
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
                              ? "border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                              : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          } cursor-pointer transition-colors`}
                          onClick={() => handleOperatorSelect(operator.address)}
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs mr-3">
                              {operator.name.substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {operator.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {operator.address.substring(0, 6)}...
                                {operator.address.substring(
                                  operator.address.length - 4,
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-indigo-600 dark:text-indigo-400">
                              {operator.apy}% APY
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        className="w-full flex items-center justify-center text-sm text-indigo-600 dark:text-indigo-400 py-2"
                        onClick={() => setShowAdvancedOperatorSelection(true)}
                      >
                        View all operators{" "}
                        <ChevronRight size={16} className="ml-1" />
                      </button>
                    </div>
                  ) : (
                    // Advanced Selection Mode - simplified for this example
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="text-center mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          Advanced Operator Selection
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Compare and select from all available operators
                        </p>
                      </div>

                      {/* This would be replaced with the full OperatorsList component */}
                      <div className="text-center text-gray-500 dark:text-gray-400 p-6 border border-dashed border-gray-200 dark:border-gray-700 rounded">
                        Full OperatorsList component would be rendered here
                      </div>

                      <button
                        className="w-full flex items-center justify-center text-sm text-indigo-600 dark:text-indigo-400 mt-4 py-2"
                        onClick={() => setShowAdvancedOperatorSelection(false)}
                      >
                        Return to quick selection{" "}
                        <ChevronRight size={16} className="ml-1" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Protocol message when deposit-then-delegate is disabled */}
              {isDepositThenDelegateDisabled && (
                <div className="flex items-start p-4 mb-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <AlertTriangle
                    size={20}
                    className="text-yellow-500 mr-3 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Two-step process required
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      This protocol requires you to deposit first, then delegate
                      in a separate transaction. You will need to delegate your
                      funds after this deposit completes.
                    </p>
                  </div>
                </div>
              )}

              {/* Estimated rewards section */}
              {isStakeMode &&
                operatorAddress &&
                parsedAmount &&
                parsedAmount > BigInt(0) && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                      Estimated Rewards
                    </h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 dark:text-green-300">
                        Annual Percentage Yield:
                      </span>
                      <span className="font-bold text-green-700 dark:text-green-200">
                        {estimatedApy}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-green-600 dark:text-green-300">
                        Estimated yearly rewards:
                      </span>
                      <span className="font-bold text-green-700 dark:text-green-200">
                        {estimatedYearlyRewards.toFixed(4)} {token.symbol}
                      </span>
                    </div>
                  </div>
                )}

              {/* Balance state visualization */}
              {parsedAmount && parsedAmount > BigInt(0) && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Balance Changes
                  </h4>

                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      Current wallet balance:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatUnits(balance, token.decimals)} {token.symbol}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-gray-600 dark:text-gray-400">
                      After transaction:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatUnits(balance - parsedAmount, token.decimals)}{" "}
                      {token.symbol}
                    </span>
                  </div>

                  <div className="h-px bg-gray-200 dark:bg-gray-700 my-3"></div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {isStakeMode && operatorAddress
                        ? "Delegated"
                        : "Claimable"}{" "}
                      balance:
                    </span>
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">
                      +{formatUnits(parsedAmount, token.decimals)}{" "}
                      {token.symbol}
                    </span>
                  </div>
                </div>
              )}

              {/* Action button */}
              <Button
                className="w-full py-2.5"
                variant={
                  txStatus === "success"
                    ? "secondary"
                    : txStatus === "error"
                      ? "destructive"
                      : "default"
                }
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
            </div>

            {/* Cross-chain progress dialog */}
            <CrossChainProgress
              progress={crossChainProgress}
              open={showProgress}
              onClose={handleCloseProgress}
              onViewDetails={() => {
                handleCloseProgress();
                // Could navigate to transaction history here
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
