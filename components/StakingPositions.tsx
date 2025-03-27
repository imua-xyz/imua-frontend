import { StakingPosition } from '@/hooks/useStakingPosition'
import { formatUnits } from 'viem'

interface StakingPositionsProps {
  positions?: StakingPosition[]
  isLoading?: boolean
  error?: Error | null
}

export function StakingPositions({ positions, isLoading, error }: StakingPositionsProps) {
  if (isLoading) {
    return (
      <div className="text-gray-500 text-center py-4">
        Loading staking positions...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-4">
        Failed to load staking positions
      </div>
    )
  }

  if (!positions?.length) {
    return (
      <div className="text-gray-500 text-center py-4">
        No staking positions found
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {positions.map((position) => (
        <div key={position.assetId} className="bg-gray-50 rounded-lg p-4">
          {/* Token Info Header */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold">
              {position.metadata.name} ({position.metadata.symbol})
            </h3>
            <p className="text-sm text-gray-600">{position.metadata.metaInfo}</p>
          </div>

          {/* Balance Information */}
          <div className="space-y-3">
            <InfoRow 
              label="Total Balance" 
              value={`${formatUnits(position.totalBalance, position.metadata.decimals)} ${position.metadata.symbol}`}
              tooltip="Total amount of tokens in the staking system"
            />
            <InfoRow 
              label="Claimable Balance" 
              value={`${formatUnits(position.claimableBalance, position.metadata.decimals)} ${position.metadata.symbol}`}
              tooltip="Amount available to withdraw"
            />
            <InfoRow 
              label="Delegated Balance" 
              value={`${formatUnits(position.delegatedBalance, position.metadata.decimals)} ${position.metadata.symbol}`}
              tooltip="Amount currently delegated to operators"
            />
            <InfoRow 
              label="Pending Undelegated" 
              value={`${formatUnits(position.pendingUndelegatedBalance, position.metadata.decimals)} ${position.metadata.symbol}`}
              tooltip="Amount in the undelegation process"
            />
            <InfoRow 
              label="Total Staked in Protocol" 
              value={`${formatUnits(position.metadata.totalStaked, position.metadata.decimals)} ${position.metadata.symbol}`}
              tooltip="Total amount staked by all users"
            />
          </div>

          {/* Additional Metadata */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <p>LZ Endpoint ID: {position.metadata.lzEndpointId}</p>
              <p>Imua Chain Index: {position.metadata.imuaChainIndex}</p>
            </div>
          </div>
        </div>
      ))}
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