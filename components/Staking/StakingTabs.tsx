import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useClientChainGateway, type TxStatus } from '@/hooks/useClientChainGateway'
import { StakingPosition } from '@/hooks/useStakingPosition'
import { StakeTab } from './StakeTab'
import { DelegateTab } from './DelegateTab'
import { UndelegateTab } from './UndelegateTab'
import { WithdrawTab } from './WithdrawTab'
import { useState } from 'react'

interface StakingTabsProps {
  onTabChange: (operationType: 'delegation' | 'asset') => void
  onStatusChange: (status: TxStatus, error?: string) => void
  gateway: ReturnType<typeof useClientChainGateway>
  selectedToken: `0x${string}`
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
  gateway, 
  selectedToken,
  balance,
  withdrawableAmount,
  position
}: StakingTabsProps) {
  const [currentTab, setCurrentTab] = useState('stake')

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab)
    const operationType = tab === 'delegate' ? 'delegation' : 'asset'
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
            gateway={gateway} 
            selectedToken={selectedToken}
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
            gateway={gateway} 
            selectedToken={selectedToken}
            balance={balance}
            onStatusChange={onStatusChange}
            position={position}
          />
        </TabsContent>

        <TabsContent value="undelegate">
          <UndelegateTab 
            gateway={gateway} 
            selectedToken={selectedToken}
            balance={balance}
            onStatusChange={onStatusChange}
            position={position}
          />
        </TabsContent>

        <TabsContent value="withdraw">
          <WithdrawTab 
            gateway={gateway} 
            selectedToken={selectedToken}
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