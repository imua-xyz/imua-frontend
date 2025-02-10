import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClientChainGateway, type TxStatus } from '@/hooks/useClientChainGateway'
import { isValidOperatorAddress } from '@/lib/utils'
import { useAmountInput } from '@/hooks/useAmountInput'

interface DelegateTabProps {
  gateway: ReturnType<typeof useClientChainGateway>
  selectedToken: `0x${string}`
  balance: {
    value: bigint
    formatted: string
    symbol: string
    decimals: number
  } | undefined
  onStatusChange?: (status: TxStatus, error?: string) => void
}

export function DelegateTab({ 
  gateway, 
  selectedToken, 
  balance,
  onStatusChange 
}: DelegateTabProps) {
  const {
    amount,
    parsedAmount,
    error: amountError,
    setAmount
  } = useAmountInput({
    decimals: balance?.decimals || 18,
  })
  
  const [operatorAddress, setOperatorAddress] = useState('')
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null)
  const [txError, setTxError] = useState<string | null>(null)
  const [operatorAddressError, setOperatorAddressError] = useState<string | null>(null)

  useEffect(() => {
    if (!operatorAddress) {
      setOperatorAddressError('Operator address is required')
    } else if (!isValidOperatorAddress(operatorAddress)) {
      setOperatorAddressError('Invalid operator address. Must be a valid bech32 address starting with exo1.')
    } else {
      setOperatorAddressError(null)
    }
  }, [operatorAddress])

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
      <div>
        <Input
          placeholder="Operator Address (starts with exo1)"
          value={operatorAddress}
          onChange={(e) => setOperatorAddress(e.target.value)}
        />
        {operatorAddressError && (
          <p className="text-sm text-red-600 mt-1">
            {operatorAddressError}
          </p>
        )}
      </div>
      <div>
        <Input
          type="text"
          placeholder={`Amount (${balance?.symbol || ''})`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {amountError && (
          <p className="text-sm text-red-600 mt-1">
            {amountError}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Button
          disabled={
            !operatorAddress || 
            !!operatorAddressError || 
            !!txStatus && txStatus !== 'error' || 
            !!amountError || 
            !amount
          }
          onClick={() => handleOperation(() => 
            gateway.handleDelegateTo(
              operatorAddress,
              selectedToken,
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
           'Delegate'}
        </Button>
        <Button
          variant="outline"
          disabled={
            !operatorAddress || 
            !!operatorAddressError || 
            !!txStatus && txStatus !== 'error' || 
            !!amountError || 
            !amount
          }
          onClick={() => handleOperation(() =>
            gateway.handleUndelegateFrom(
              operatorAddress,
              selectedToken,
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
      </div>
      {txError && (
        <p className="text-sm text-red-600 mt-2">
          {txError}
        </p>
      )}
    </div>
  )
} 