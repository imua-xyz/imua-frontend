import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StakingProvider, TxStatus } from '@/types/staking'
import { useAmountInput } from '@/hooks/useAmountInput'
import { formatUnits } from 'ethers'

interface WithdrawTabProps {
  stakingProvider: StakingProvider
  balance: {
    value: bigint
    formatted: string
    symbol: string
    decimals: number
  } | undefined
  position: {
    claimableBalance: bigint
  } | undefined
  withdrawableAmount: bigint
  onStatusChange?: (status: TxStatus, error?: string) => void
}

export function WithdrawTab({ 
  stakingProvider, 
  balance, 
  position,
  withdrawableAmount,
  onStatusChange 
}: WithdrawTabProps) {
  const {
    amount: claimAmount,
    parsedAmount: parsedClaimAmount,
    error: claimAmountError,
    setAmount: setClaimAmount
  } = useAmountInput({
    decimals: balance?.decimals || 18,
    maxAmount: position?.claimableBalance // Max for claim is claimable balance
  })

  const {
    amount: withdrawAmount,
    parsedAmount: parsedWithdrawAmount,
    error: withdrawAmountError,
    setAmount: setWithdrawAmount
  } = useAmountInput({
    decimals: balance?.decimals || 18,
    maxAmount: withdrawableAmount // Max for withdraw is withdrawable amount
  })

  const [recipientAddress, setRecipientAddress] = useState('')
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null)
  const [txError, setTxError] = useState<string | null>(null)

  // Check if claimPrincipal is available in this stakingProvider
  const canClaimPrincipal = !!stakingProvider.claimPrincipal;

  const handleOperation = async (operation: () => Promise<string>) => {
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
      {/* Only render the claim section if claimPrincipal is available */}
      {canClaimPrincipal && (
        <>
          <div>
            <Input
              type="text"
              placeholder={`Claim amount (max: ${position?.claimableBalance ? formatUnits(position.claimableBalance, balance?.decimals || 18) : '0'} ${balance?.symbol || ''})`}
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
            />
            {claimAmountError && (
              <p className="text-sm text-red-600 mt-1">
                {claimAmountError}
              </p>
            )}
          </div>
          <Button
            className="w-full"
            variant="default"
            disabled={!!txStatus && txStatus !== 'error' || !!claimAmountError || !claimAmount}
            onClick={() => handleOperation(() =>
              stakingProvider.claimPrincipal!(
                parsedClaimAmount,
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
             '1. Claim Principal'}
          </Button>
        </>
      )}

      <div className="space-y-2">
        <Input
          type="text"
          placeholder={`Withdraw Amount (max: ${formatUnits(withdrawableAmount, balance?.decimals || 18)} ${balance?.symbol || ''})`}
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
        />
        {withdrawAmountError && (
          <p className="text-sm text-red-600 mt-1">
            {withdrawAmountError}
          </p>
        )}
        <Input
          placeholder="Recipient Address (optional)"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
        />
        <Button
          className="w-full"
          variant="outline"
          disabled={!!txStatus && txStatus !== 'error' || !!withdrawAmountError || !withdrawAmount}
          onClick={() => handleOperation(() =>
            stakingProvider.withdrawPrincipal!(
              parsedWithdrawAmount,
              recipientAddress as `0x${string}`,
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
           `${canClaimPrincipal ? '2. ' : ''}Withdraw Principal`}
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