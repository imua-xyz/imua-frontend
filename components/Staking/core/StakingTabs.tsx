import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StakingProvider, TxStatus, StakingPosition } from '@/types/staking'
import { StakeTab } from './StakeTab'
import { DelegateTab } from './DelegateTab'
import { UndelegateTab } from './UndelegateTab'
import { WithdrawTab } from './WithdrawTab'
import { useState } from 'react'

interface StakingTabsProps {
  onTabChange: (operationType: 'delegation' | 'asset') => void
  onStatusChange: (status: TxStatus, error?: string) => void
  stakingProvider: StakingProvider
  selectedToken: `0x${string}`
  vaultAddress: `0x${string}`
  balance: {
    value: bigint
    formatted: string
    symbol: string
    decimals: number
  } | undefined
  withdrawableAmount: bigint
  position: StakingPosition
}

export function StakingTabs({ 
  onTabChange, 
  onStatusChange, 
  stakingProvider, 
  selectedToken,
  vaultAddress,
  balance,
  withdrawableAmount,
  position
}: StakingTabsProps) {
  const [currentTab, setCurrentTab] = useState('stake')

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab)
    const operationType = tab === 'delegate' || tab === 'undelegate' ? 'delegation' : 'asset'
    onTabChange(operationType)
  }

  return (
    <Tabs defaultValue="stake" onValueChange={handleTabChange}>
      <TabsList className="w-full grid grid-cols-4">
        <TabsTrigger value="stake" className="flex-1">Stake</TabsTrigger>
        <TabsTrigger value="delegate" className="flex-1">Delegate</TabsTrigger>
        <TabsTrigger value="undelegate" className="flex-1">Undelegate</TabsTrigger>
        <TabsTrigger value="withdraw" className="flex-1">Withdraw</TabsTrigger>
      </TabsList>

      <div className="mt-4">
        <TabsContent value="stake">
          <StakeTab 
            stakingProvider={stakingProvider} 
            selectedToken={selectedToken}
            vaultAddress={vaultAddress}
            balance={balance}
            onStatusChange={onStatusChange}
            onOperatorAddressChange={(hasOperator) => {
              if (currentTab === 'stake') {
                onTabChange(hasOperator ? 'delegation' : 'asset')
              }
            }}
          />
        </TabsContent>

        <TabsContent value="delegate">
          <DelegateTab 
            stakingProvider={stakingProvider} 
            selectedToken={selectedToken}
            balance={balance}
            onStatusChange={onStatusChange}
            position={position}
          />
        </TabsContent>

        <TabsContent value="undelegate">
          <UndelegateTab 
            stakingProvider={stakingProvider} 
            selectedToken={selectedToken}
            balance={balance}
            onStatusChange={onStatusChange}
            position={position}
          />
        </TabsContent>

        <TabsContent value="withdraw">
          <WithdrawTab 
            stakingProvider={stakingProvider} 
            balance={balance}
            withdrawableAmount={withdrawableAmount}
            onStatusChange={onStatusChange}
            position={position}
          />
        </TabsContent>
      </div>
    </Tabs>
  )
}