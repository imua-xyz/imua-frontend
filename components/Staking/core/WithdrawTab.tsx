import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StakingProvider, TxStatus } from '@/types/staking'
import { useAmountInput } from '@/hooks/useAmountInput'
import { formatUnits } from 'ethers'

interface WithdrawTabProps {
  stakingProvider: StakingProvider
  onStatusChange?: (status: TxStatus, error?: string) => void
}

export function WithdrawTab({ 
  stakingProvider, 
  onStatusChange 
}: WithdrawTabProps) {
  const decimals = stakingProvider.walletBalance?.decimals || 0
  const maxClaimAmount = stakingProvider.stakerBalance?.claimable || BigInt(0)
  const maxWithdrawAmount = stakingProvider.stakerBalance?.withdrawable || BigInt(0)

  const {
    amount: claimAmount,
    parsedAmount: parsedClaimAmount,
    error: claimAmountError,
    setAmount: setClaimAmount
  } = useAmountInput({
    decimals: decimals,
    maxAmount: maxClaimAmount
  })

  const {
    amount: withdrawAmount,
    parsedAmount: parsedWithdrawAmount,
    error: withdrawAmountError,
    setAmount: setWithdrawAmount
  } = useAmountInput({
    decimals: decimals,
    maxAmount: maxWithdrawAmount
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
              placeholder={`Claim amount (max: ${maxClaimAmount ? formatUnits(maxClaimAmount, decimals) : '0'} ${stakingProvider.walletBalance?.symbol || ''})`}
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
          placeholder={`Withdraw Amount (max: ${maxWithdrawAmount ? formatUnits(maxWithdrawAmount, decimals) : '0'} ${stakingProvider.walletBalance?.symbol || ''})`}
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