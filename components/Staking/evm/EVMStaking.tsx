import { useState, useEffect } from 'react'
import { useAccount, useNetwork, useSwitchChain } from 'wagmi'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Staking } from '../core'
import { useLSTStakingProvider } from '@/hooks/useLSTStakingProvider'
import { useStakingPosition } from '@/hooks/useStakingPosition'
import { config } from '@/config/wagmi'
import { StakingPositions } from '@/components/StakingPositions'

interface EVMStakingProps {
  defaultToken?: `0x${string}`
}

export function EVMStaking({ defaultToken }: EVMStakingProps) {
  const { address, isConnected } = useAccount()
  const { chain } = useNetwork()
  const { switchChain } = useSwitchChain()
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | null>(defaultToken || null)
  
  // Only fetch positions for the selected token if it exists
  const { positions, position, isLoading, error } = useStakingPosition(selectedToken)
  
  // Create staking provider for the selected token
  const stakingProvider = selectedToken 
    ? useLSTStakingProvider(selectedToken) 
    : null

  // Handle token selection
  const handleTokenSelect = (token: `0x${string}` | null) => {
    setSelectedToken(token)
  }
  
  if (!isConnected) {
    return (
      <Card className="p-6">
        <Alert className="mb-4">
          <AlertDescription>
            Please connect your wallet to use EVM staking features.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => window.open('https://metamask.io', '_blank')}>
          Install Metamask
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Your EVM Staking Positions</h2>
        <StakingPositions 
          positions={positions} 
          isLoading={isLoading} 
          error={error} 
        />
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">EVM Staking</h2>
        
        {stakingProvider && position ? (
          <Staking 
            stakingProvider={stakingProvider}
            onTokenSelect={handleTokenSelect}
            chain={chain}
            position={position}
          />
        ) : selectedToken && isLoading ? (
          <div className="text-center py-8">
            <p>Loading staking data...</p>
          </div>
        ) : selectedToken && error ? (
          <Alert variant="destructive">
            <AlertDescription>
              Error loading staking data. Please try again later.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">
              Select a token to start staking.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
