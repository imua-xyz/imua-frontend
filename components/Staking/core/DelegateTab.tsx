import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StakingProvider, TxStatus } from "@/types/staking";
import { useAmountInput } from "@/hooks/useAmountInput";
import { OperatorSelector } from "./OperatorSelector";
import { formatUnits } from "viem";

interface DelegateTabProps {
  stakingProvider: StakingProvider;
  selectedToken: `0x${string}`;
  onStatusChange?: (status: TxStatus, error?: string) => void;
}

export function DelegateTab({
  stakingProvider,
  selectedToken,
  onStatusChange,
}: DelegateTabProps) {
  const maxAmount = stakingProvider.stakerBalance?.withdrawable || BigInt(0);
  const decimals = stakingProvider.walletBalance?.decimals || 0;
  const {
    amount,
    parsedAmount,
    error: amountError,
    setAmount,
  } = useAmountInput({ decimals: decimals, maxAmount: maxAmount });

  const [operatorAddress, setOperatorAddress] = useState("");
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const handleOperation = async (
    operation: () => Promise<{
      hash: string;
      success: boolean;
      error?: string;
    }>,
  ) => {
    setTxError(null);
    setTxStatus("processing");

    try {
      const { success, error } = await operation();
      if (success) {
        setTxStatus("success");
      } else {
        setTxStatus("error");
        setTxError(error || "Transaction failed");
      }

      setTimeout(() => {
        setTxStatus(null);
        setTxError(null);
      }, 3000);
    } catch (error) {
      console.error("Operation failed:", error);
      setTxStatus("error");
      setTxError(error instanceof Error ? error.message : "Transaction failed");
      setTimeout(() => {
        setTxStatus(null);
        setTxError(null);
      }, 3000);
    }
  };

  return (
    <div className="space-y-4">
      <OperatorSelector onSelect={setOperatorAddress} value={operatorAddress} />
      <Input
        type="text"
        placeholder={`Amount (max: ${maxAmount ? formatUnits(maxAmount, decimals) : "0"} ${stakingProvider.walletBalance?.symbol || ""})`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {amountError && (
        <p className="text-sm text-red-600 mt-1">{amountError}</p>
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
          !operatorAddress ||
          !selectedToken ||
          !stakingProvider
        }
        onClick={() =>
          handleOperation(() =>
            stakingProvider.delegateTo(operatorAddress, parsedAmount, {
              onStatus: (status, error) => {
                setTxStatus(status);
                if (error) setTxError(error);
                onStatusChange?.(status, error);
              },
            }),
          )
        }
      >
        {txStatus === "processing"
          ? "Processing..."
          : txStatus === "success"
            ? "Success!"
            : txStatus === "error"
              ? "Failed!"
              : "Delegate"}
      </Button>
      {txError && <p className="text-sm text-red-600 mt-2">{txError}</p>}
    </div>
  );
}
