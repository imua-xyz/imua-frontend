import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLSTOperations, type TxStatus } from '@/hooks/useLSTOperations'
import { useAmountInput } from '@/hooks/useAmountInput'
import { OperatorSelector } from './OperatorSelector'

interface StakeTabProps {
  LSTController: ReturnType<typeof useLSTOperations>
  selectedToken: `0x${string}`
  vaultAddress: `0x${string}`
  balance: {
    value: bigint
    formatted: string
    symbol: string
    decimals: number
  } | undefined
  onStatusChange?: (status: TxStatus, error?: string) => void
  onOperatorAddressChange: (hasOperator: boolean) => void
}

export function StakeTab({ 
  LSTController, 
  selectedToken,
  vaultAddress,
  balance,
  onStatusChange,
  onOperatorAddressChange 
}: StakeTabProps) {
  const {
    amount,
    parsedAmount,
    error: amountError,
    setAmount
  } = useAmountInput({
    decimals: balance?.decimals || 18,
    maxAmount: balance?.value
  })

  const [operatorAddress, setOperatorAddress] = useState('')
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null)
  const [txError, setTxError] = useState<string | null>(null)

  const handleOperatorSelect = (address: string) => {
    setOperatorAddress(address)
    onOperatorAddressChange(!!address)
  }

  const handleOperation = async (
    operation: () => Promise<`0x${string}`>,
    options?: { requiresApproval?: boolean }
  ) => {
    setTxError(null)
    setTxStatus(options?.requiresApproval ? 'approving' : 'processing')

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
      <Input
        type="text"
        placeholder={`Amount (max: ${balance?.formatted || '0'} ${balance?.symbol || ''})`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {amountError && (
        <p className="text-sm text-red-600">
          {amountError}
        </p>
      )}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm text-gray-600">Operator (Optional)</label>
          <span className="text-xs text-gray-500">
            {operatorAddress ? "Will deposit & delegate" : "Will only deposit"}
          </span>
        </div>
        <OperatorSelector 
          onSelect={handleOperatorSelect}
          value={operatorAddress}
        />
      </div>
      <Button
        className="w-full"
        variant={txStatus === 'success' ? 'secondary' : txStatus === 'error' ? 'destructive' : 'default'}
        disabled={
          (!!txStatus && txStatus !== 'error') ||
          !!amountError ||
          !amount ||
          !selectedToken ||
          !LSTController
        }
        onClick={() => handleOperation(
          () => LSTController.stakeWithApproval(
            parsedAmount,
            vaultAddress,
            operatorAddress || undefined,
            {
              onStatus: (status, error) => {
                setTxStatus(status)
                if (error) setTxError(error)
                onStatusChange?.(status, error)
              }
            }
          ),
          { requiresApproval: true }
        )}
      >
        {txStatus === 'approving' ? 'Approving...' :
         txStatus === 'processing' ? 'Processing...' :
         txStatus === 'success' ? 'Success!' :
         txStatus === 'error' ? 'Failed!' :
         operatorAddress ? 'Stake' : 'Deposit'}
      </Button>
      {txError && (
        <p className="text-sm text-red-600 mt-2">
          {txError}
        </p>
      )}
    </div>
  )
} 