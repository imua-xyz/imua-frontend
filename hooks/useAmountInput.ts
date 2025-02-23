import { useState } from 'react'
import { formatUnits, parseUnits } from 'viem'

interface UseAmountInputProps {
  decimals: number
  maxAmount?: bigint
}

export function useAmountInput({ decimals, maxAmount }: UseAmountInputProps) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAmountChange = (value: string) => {
    // Clear error on new input
    setError(null)

    // Allow empty input
    if (value === '') {
      setAmount('')
      return
    }

    // Only allow numbers and one decimal point
    if (!/^\d*\.?\d*$/.test(value)) {
      return
    }

    try {
      const parsedAmount = parseUnits(value || '0', decimals)
      
      // Check for zero amount
      if (parsedAmount === BigInt(0)) {
        setError('Amount must be greater than 0')
        setAmount(value)
        return
      }

      // Check if amount exceeds max (including zero max)
      if (maxAmount !== undefined) {
        if (maxAmount === BigInt(0) && parsedAmount > BigInt(0)) {
            setError('No available balance')
            setAmount(value)
            return
        }
        if (parsedAmount > maxAmount) {
          setError(`Amount exceeds balance: ${formatUnits(maxAmount, decimals)}`)
          setAmount(value)
          return
        }
      }

      setAmount(value)
    } catch (e) {
      setError('Invalid amount')
    }
  }

  const parsedAmount = amount ? parseUnits(amount, decimals).toString() : '0'
  console.log('parsedAmount', parsedAmount)

  return {
    amount,
    parsedAmount,
    error,
    setAmount: handleAmountChange
  }
} 