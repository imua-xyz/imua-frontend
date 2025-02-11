import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClientChainGateway, type TxStatus } from '@/hooks/useClientChainGateway'
import { isValidOperatorAddress } from '@/lib/utils'
import { useAmountInput } from '@/hooks/useAmountInput'

interface StakeTabProps {
  gateway: ReturnType<typeof useClientChainGateway>
  selectedToken: `0x${string}`
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
  gateway, 
  selectedToken,
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
  const [operatorAddressError, setOperatorAddressError] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null)
  const [txError, setTxError] = useState<string | null>(null)

  // Validate operator address whenever it changes
  useEffect(() => {
    if (operatorAddress && !isValidOperatorAddress(operatorAddress)) {
      setOperatorAddressError('Invalid operator address. Must be a valid bech32 address starting with exo1.')
      onOperatorAddressChange(false)
    } else {
      setOperatorAddressError(null)
      onOperatorAddressChange(!!operatorAddress && isValidOperatorAddress(operatorAddress))
    }
  }, [operatorAddress, onOperatorAddressChange])

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
      <div>
        <Input
          type="text"
          placeholder={`Amount (max: ${balance?.formatted || '0'} ${balance?.symbol})`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {amountError && (
          <p className="text-sm text-red-600 mt-1">
            {amountError}
          </p>
        )}
      </div>
      <div>
        <Input
          placeholder="Operator Address (optional, starts with exo1)"
          value={operatorAddress}
          onChange={(e) => setOperatorAddress(e.target.value)}
        />
        {operatorAddressError && (
          <p className="text-sm text-red-600 mt-1">
            {operatorAddressError}
          </p>
        )}
      </div>
      <Button
        className="w-full"
        variant={txStatus === 'success' ? 'secondary' : txStatus === 'error' ? 'destructive' : 'default'}
        onClick={() => handleOperation(
          () => gateway.handleStakeWithApproval(
            selectedToken,
            parsedAmount,
            isValidOperatorAddress(operatorAddress) ? operatorAddress : undefined,
            (status, error) => {
              setTxStatus(status)
              if (error) setTxError(error)
              onStatusChange?.(status, error)
            }
          ),
          { requiresApproval: true }
        )}
        disabled={Boolean(
          (!!txStatus && txStatus !== 'error') || 
          !!amountError || 
          !amount || 
          (operatorAddress && !!operatorAddressError)
        )}
      >
        {txStatus === 'approving' ? 'Approving...' :
         txStatus === 'processing' ? 'Processing...' :
         txStatus === 'success' ? 'Success!' :
         txStatus === 'error' ? 'Failed!' :
         isValidOperatorAddress(operatorAddress) ? 'Stake' : 'Deposit'}
      </Button>
      {txError && (
        <p className="text-sm text-red-600 mt-2">
          {txError}
        </p>
      )}
    </div>
  )
} 