import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { BaseStaking } from '../core/BaseStaking'
import { useXrpStakingProvider } from '@/hooks/useXrpStakingProvider'
import { useXRPContextProvider } from '@/hooks/useXRPContextProvider'

export function XRPStaking() {
  const stakingContext = useXRPContextProvider()
  
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | undefined>(undefined)
  const stakingProvider = useXrpStakingProvider()
  
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">EVM Staking</h2>
      <BaseStaking 
        selectedToken={selectedToken}
        onTokenSelect={setSelectedToken}
        stakingContext={stakingContext}
        stakingProvider={stakingProvider}
      />
    </Card>
  )
}
