// components/Staking/core/StakeTab.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAmountInput } from "@/hooks/useAmountInput";
import { OperatorSelector } from "./OperatorSelector";
import { StakingProvider, TxStatus } from "@/types/staking";
import { formatUnits } from "viem";
import {
  CrossChainProgress,
  CrossChainProgress as CrossChainProgressType,
} from "@/components/ui/cross-chain-progress";

interface StakeTabProps {
  stakingProvider: StakingProvider;
  selectedToken: `0x${string}`;
  onStatusChange?: (status: TxStatus, error?: string) => void;
  onOperatorAddressChange: (hasOperator: boolean) => void;
  sourceChain: string;
  destinationChain: string;
}

export function StakeTab({
  stakingProvider,
  selectedToken,
  onStatusChange,
  onOperatorAddressChange,
  sourceChain,
  destinationChain,
}: StakeTabProps) {
  const maxAmount = stakingProvider.walletBalance?.value || BigInt(0);
  const decimals = stakingProvider.walletBalance?.decimals || 0;
  const {
    amount,
    parsedAmount,
    error: amountError,
    setAmount,
  } = useAmountInput({
    decimals: decimals,
    minimumAmount: stakingProvider.minimumStakeAmount,
    maxAmount: maxAmount,
  });

  const [operatorAddress, setOperatorAddress] = useState("");
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Check if deposit-then-delegate is disabled
  const isDepositThenDelegateDisabled =
    !!stakingProvider.isDepositThenDelegateDisabled;

  // Cross-chain progress tracking
  const [showProgress, setShowProgress] = useState(false);
  const [crossChainProgress, setCrossChainProgress] =
    useState<CrossChainProgressType>({
      sourceChain,
      destinationChain,
      operation:
        !isDepositThenDelegateDisabled && operatorAddress ? "stake" : "deposit",
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
          description: `Sending ${!isDepositThenDelegateDisabled && operatorAddress ? "stake" : "deposit"} transaction`,
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

  const handleOperatorSelect = (address: string) => {
    if (isDepositThenDelegateDisabled) return;

    setOperatorAddress(address);
    onOperatorAddressChange(!!address);

    // Update operation type in progress tracking
    setCrossChainProgress((prev) => ({
      ...prev,
      operation: address ? "stake" : "deposit",
    }));
  };

  // Update progress based on transaction status
  useEffect(() => {
    if (!txStatus) return;

    // Using functional update pattern
    setCrossChainProgress((prev) => {
      const updatedProgress = { ...prev };

      switch (txStatus) {
        case "approving":
          updatedProgress.currentStepIndex = 0;
          updatedProgress.steps[0].status = "processing";
          updatedProgress.overallStatus = "approving";
          break;

        case "processing":
          // If we're moving from approval to processing
          if (updatedProgress.steps[0].status === "processing") {
            updatedProgress.steps[0].status = "success";
          }
          updatedProgress.currentStepIndex = 1;
          updatedProgress.steps[1].status = "processing";
          updatedProgress.overallStatus = "processing";
          break;

        case "success":
          // Transaction confirmed on source chain
          updatedProgress.steps[0].status = "success"; // Approval
          updatedProgress.steps[1].status = "success"; // Transaction
          updatedProgress.currentStepIndex = 2;
          updatedProgress.steps[2].status = "success"; // Confirmation
          updatedProgress.currentStepIndex = 3;
          updatedProgress.steps[3].status = "processing"; // Now relaying
          updatedProgress.overallStatus = "relaying";
          break;

        case "error":
          // Find the current processing step and mark it as error
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

    // For the success case, handle timeouts separately
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
        }, 3000);

        // Clean up inner timeout if component unmounts
        return () => clearTimeout(innerTimeoutId);
      }, 5000);

      // Clean up timeout if component unmounts or txStatus changes
      return () => clearTimeout(timeoutId);
    }
  }, [txStatus]); // Only depend on txStatus

  const handleOperation = async (
    operation: () => Promise<{
      hash: string;
      success: boolean;
      error?: string;
    }>,
    options?: { requiresApproval?: boolean },
  ) => {
    setTxError(null);
    setTxStatus(options?.requiresApproval ? "approving" : "processing");
    setShowProgress(true);

    try {
      const { hash, success, error } = await operation();

      // Update transaction hash in progress
      setCrossChainProgress((prev) => {
        const updated = { ...prev };
        const currentStep = updated.steps[updated.currentStepIndex];
        currentStep.txHash = hash;
        currentStep.explorerUrl = ``;
        return updated;
      });

      if (success) {
        setTxStatus("success");
      } else {
        setTxStatus("error");
        setTxError(error || "Transaction failed");
      }
    } catch (error) {
      console.error("Operation failed:", error);
      setTxStatus("error");
      setTxError(error instanceof Error ? error.message : "Transaction failed");
    }
  };

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
      }, 500);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder={`Amount (min: ${stakingProvider.minimumStakeAmount ? formatUnits(stakingProvider.minimumStakeAmount, decimals) : "0"}, max: ${maxAmount ? formatUnits(maxAmount, decimals) : "0"} ${stakingProvider.walletBalance?.symbol || ""} )`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {amountError && <p className="text-sm text-red-600">{amountError}</p>}

      {/* Only show operator selector if deposit-then-delegate is allowed */}
      {!isDepositThenDelegateDisabled && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm text-gray-600">Operator (Optional)</label>
            <span className="text-xs text-gray-500">
              {operatorAddress
                ? "Will deposit & delegate"
                : "Will only deposit"}
            </span>
          </div>
          <OperatorSelector
            onSelect={handleOperatorSelect}
            value={operatorAddress}
          />
        </div>
      )}

      {/* Show info message when deposit-then-delegate is disabled */}
      {isDepositThenDelegateDisabled && (
        <div className="rounded-lg bg-yellow-50 p-3">
          <p className="text-sm text-yellow-800">
            You will need to delegate separately after depositing. This protocol
            requires a two-step process.
          </p>
        </div>
      )}

      <Button
        className="w-full"
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
          !selectedToken ||
          !stakingProvider
        }
        onClick={() =>
          handleOperation(
            () =>
              stakingProvider.stake(
                parsedAmount,
                stakingProvider.vaultAddress as `0x${string}`,
                !isDepositThenDelegateDisabled
                  ? operatorAddress || undefined
                  : undefined,
                {
                  onStatus: (status, error) => {
                    setTxStatus(status);
                    if (error) setTxError(error);
                    onStatusChange?.(status, error);
                  },
                },
              ),
            { requiresApproval: true },
          )
        }
      >
        {txStatus === "approving"
          ? "Approving..."
          : txStatus === "processing"
            ? "Processing..."
            : txStatus === "success"
              ? "Success!"
              : txStatus === "error"
                ? "Failed!"
                : isDepositThenDelegateDisabled
                  ? "Deposit"
                  : operatorAddress
                    ? "Stake"
                    : "Deposit"}
      </Button>

      {txError && <p className="text-sm text-red-600 mt-2">{txError}</p>}

      {/* Cross-chain progress dialog */}
      <CrossChainProgress
        progress={crossChainProgress}
        open={showProgress}
        onClose={handleCloseProgress}
        onViewDetails={() => {
          // Navigate to transaction history or details page
          handleCloseProgress();
          // You could add navigation here
        }}
      />
    </div>
  );
}
