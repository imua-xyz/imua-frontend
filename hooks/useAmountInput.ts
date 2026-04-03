import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";

interface UseAmountInputProps {
  decimals: number;
  minimumAmount?: bigint;
  maxAmount?: bigint;
}

export function useAmountInput({
  decimals,
  minimumAmount,
  maxAmount,
}: UseAmountInputProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAmountChange = (value: string) => {
    // Clear error on new input
    setError(null);

    // Allow empty input
    if (value === "") {
      setAmount("");
      return;
    }

    // Only allow numbers and one decimal point
    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }

    try {
      const parsedAmount = parseUnits(value || "0", decimals);

      // Check for zero amount
      if (parsedAmount === BigInt(0)) {
        setError("Amount must be greater than 0");
        setAmount(value);
        return;
      }

      // Check if amount is less than minimum
      if (minimumAmount !== undefined) {
        if (parsedAmount < minimumAmount) {
          setError(
            `Amount must be greater than ${formatUnits(minimumAmount, decimals)}`,
          );
          setAmount(value);
          return;
        }
      }

      // Check if amount exceeds max (including zero max)
      if (maxAmount !== undefined) {
        if (maxAmount === BigInt(0) && parsedAmount > BigInt(0)) {
          setError("No available balance");
          setAmount(value);
          return;
        }
        if (parsedAmount > maxAmount) {
          setError(
            `Amount exceeds balance: ${formatUnits(maxAmount, decimals)}`,
          );
          setAmount(value);
          return;
        }
      }

      setAmount(value);
    } catch (_e) {
      setError("Invalid amount");
    }
  };

  const parsedAmount = amount ? parseUnits(amount, decimals) : BigInt(0);

  // Re-validate the current amount whenever constraints change (e.g. balance
  // query finishes and maxAmount is updated). This prevents stale errors like
  // "No available balance" from sticking around after the user actually has
  // balance.
  useEffect(() => {
    if (amount !== "") {
      handleAmountChange(amount);
    }
    // We intentionally do not include handleAmountChange in deps to avoid
    // re-creating the effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxAmount, minimumAmount, decimals]);

  return {
    amount,
    parsedAmount,
    error,
    setAmount: handleAmountChange,
  };
}
