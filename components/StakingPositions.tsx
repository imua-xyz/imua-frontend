import { useIAssets } from '@/hooks/useIAssets'
import { formatEther } from 'viem'
import { exocore } from '@/config/wagmi'

export function StakingPositions({ 
  tokenAddress 
}: { 
  tokenAddress: `0x${string}`
}) {
  const { success, stakerBalance } = useIAssets(tokenAddress)

  if (!success || !stakerBalance) {
    return (
      <div className="text-gray-500 text-center py-4">
        Select a token to view your staking positions
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Balance */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm text-gray-600">Total Staked Balance</div>
        <div className="text-2xl font-semibold">
          {formatEther(stakerBalance.balance)} ETH
        </div>
      </div>

      {/* Detailed Positions */}
      <div className="space-y-3">
        <InfoRow 
          label="Active Delegations" 
          value={`${formatEther(stakerBalance.delegated)} ETH`}
          tooltip="Amount currently delegated to operators"
        />
        <InfoRow 
          label="Available to Withdraw" 
          value={`${formatEther(stakerBalance.withdrawable)} ETH`}
          tooltip="Amount you can withdraw now"
        />
        <InfoRow 
          label="Undelegating" 
          value={`${formatEther(stakerBalance.pendingUndelegated)} ETH`}
          tooltip="Amount in the undelegation process"
        />
        <InfoRow 
          label="Lifetime Deposits" 
          value={`${formatEther(stakerBalance.totalDeposited)} ETH`}
          tooltip="Total amount you have ever deposited"
        />
      </div>
    </div>
  )
}

function InfoRow({ 
  label, 
  value,
  tooltip 
}: { 
  label: string
  value: string
  tooltip?: string
}) {
  return (
    <div className="flex justify-between items-center group relative">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
      {tooltip && (
        <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-sm rounded whitespace-nowrap">
          {tooltip}
        </div>
      )}
    </div>
  )
} 