import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLSTOperations, type TxStatus } from '@/hooks/useLSTOperations'
import { useAmountInput } from '@/hooks/useAmountInput'
import { OperatorSelector } from './OperatorSelector'
import { formatUnits } from 'viem'

interface UndelegateTabProps {
  LSTController: ReturnType<typeof useLSTOperations>
  selectedToken: `0x${string}`
  balance: {
    value: bigint
    formatted: string
    symbol: string
    decimals: number
  } | undefined
  position?: {
    delegatedBalance: bigint
  }
  onStatusChange?: (status: TxStatus, error?: string) => void
}

export function UndelegateTab({ 
  LSTController, 
  selectedToken, 
  balance,
  position,
  onStatusChange 
}: UndelegateTabProps) {
  const {
    amount,
    parsedAmount,
    error: amountError,
    setAmount
  } = useAmountInput({
    decimals: balance?.decimals || 18,
    maxAmount: position?.delegatedBalance
  })
  
  const [operatorAddress, setOperatorAddress] = useState('')
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null)
  const [txError, setTxError] = useState<string | null>(null)

  const handleOperation = async (operation: () => Promise<`0x${string}`>) => {
    setTxError(null)
    setTxStatus('processing')

    try {
      await operation()
      setTxStatus('success')
      setTimeout(() => {
        setTxStatus(null)
        setTxError(null)
      }, 3000)
    } catch (error) {
      console.error('Operation failed:', error)
      setTxStatus('error')
      setTxError(error instanceof Error ? error.message : 'Transaction failed')
      setTimeout(() => {
        setTxStatus(null)
        setTxError(null)
      }, 3000)
    }
  }

  return (
    <div className="space-y-4">
      <OperatorSelector 
        onSelect={setOperatorAddress}
        value={operatorAddress}
      />
      <Input
        type="text"
        placeholder={`Amount (max: ${position?.delegatedBalance ? formatUnits(position.delegatedBalance, balance?.decimals || 18) : '0'} ${balance?.symbol || ''})`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {amountError && (
        <p className="text-sm text-red-600 mt-1">
          {amountError}
        </p>
      )}
      <Button
        className="w-full"
        variant={txStatus === 'success' ? 'secondary' : txStatus === 'error' ? 'destructive' : 'default'}
        disabled={
          (!!txStatus && txStatus !== 'error') ||
          !!amountError ||
          !amount ||
          !operatorAddress ||
          !selectedToken ||
          !LSTController
        }
        onClick={() => handleOperation(() =>
          LSTController.delegateTo(
            operatorAddress,
            parsedAmount,
            {
              onStatus: (status, error) => {
                setTxStatus(status)
                if (error) setTxError(error)
                onStatusChange?.(status, error)
              }
            }
          )
        )}
      >
        {txStatus === 'processing' ? 'Processing...' :
         txStatus === 'success' ? 'Success!' :
         txStatus === 'error' ? 'Failed!' :
         'Undelegate'}
      </Button>
      {txError && (
        <p className="text-sm text-red-600 mt-2">
          {txError}
        </p>
      )}
    </div>
  )
} 