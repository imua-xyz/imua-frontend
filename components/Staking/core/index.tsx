import { useState } from 'react'
import { useAccount, useBalance, useSwitchChain } from 'wagmi'
import { config, NETWORK_CHAIN_IDS } from '@/config/wagmi'
import { StakingProvider, TxStatus, StakingPosition } from '@/types/staking'
import { useVaultAddress } from '@/hooks/useVaultAddress'
import { useVault } from '@/hooks/useVault'
import { TokenSelector } from './TokenSelector'
import { TokenInfo } from './TokenInfo'
import { StakingTabs } from './StakingTabs'
import { VIRTUAL_TOKEN } from '@/config/constants'
import { Button } from '@/components/ui/button'
import { CONTRACTS } from '@/config/contracts'

interface StakingProps {
  stakingProvider: StakingProvider
  onTokenSelect: (token: `0x${string}` | null) => void
  chain: typeof config.chains[number] | undefined
  position: StakingPosition
}

export function Staking({ stakingProvider, onTokenSelect, chain, position }: StakingProps) {
  const { address: userAddress, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | null>(null)
  const vaultAddress = useVaultAddress(selectedToken!)
  const vault = useVault(vaultAddress as `0x${string}`)
  const [relayFee, setRelayFee] = useState<bigint>(BigInt(0))

  const { data: balance } = useBalance({
    address: userAddress,
    token: selectedToken && selectedToken.toLowerCase() === VIRTUAL_TOKEN.toLowerCase() 
      ? undefined 
      : selectedToken || undefined,
  })

  // Check if contract is available on current network
  const isContractAvailable = chain?.id && 
    CONTRACTS.CLIENT_CHAIN_GATEWAY.address[chain.name.toLowerCase() as keyof typeof CONTRACTS.CLIENT_CHAIN_GATEWAY.address]

  // Update relay fee when tab changes or operation type changes
  const updateRelayFee = async (operationType: 'delegation' | 'asset') => {
    if (!stakingProvider) return
    const fee = await stakingProvider.getQuote(operationType)
    setRelayFee(fee as bigint)
  }

  // Handle token selection
  const handleTokenSelect = (token: `0x${string}`) => {
    setSelectedToken(token)
    onTokenSelect(token)
  }

  // Handle transaction status changes
  const handleStatusChange = (status: TxStatus, error?: string) => {
    console.log('Transaction status:', status, error)
  }

  // Replace switchNetwork hook with function
  const handleSwitchNetwork = async (chainId: number) => {
    try {
      await switchChain({ chainId })
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  return (
    <div className="space-y-6">
      <TokenSelector 
        selectedToken={selectedToken}
        onSelect={handleTokenSelect}
        isConnected={isConnected}
      />

      {isConnected && !isContractAvailable ? (
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-yellow-800">
            ClientChainGateway contract is not available on {chain?.name}. 
            Please switch to a supported network.
          </p>
          {Object.entries(CONTRACTS.CLIENT_CHAIN_GATEWAY.address)
            .filter(([network]) => NETWORK_CHAIN_IDS[network])
            .map(([network, address]) => (
              address && (
                <Button 
                  key={network}
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleSwitchNetwork(NETWORK_CHAIN_IDS[network])}
                >
                  Switch to {network.charAt(0).toUpperCase() + network.slice(1)}
                </Button>
              )
            ))}
        </div>
      ) : isConnected && selectedToken && (
        <>
          <TokenInfo
            token={selectedToken}
            vaultAddress={vaultAddress as `0x${string}`}
            balance={balance}
            withdrawableAmount={vault.withdrawableAmount ?? BigInt(0)}
            relayFee={relayFee}
          />

          <StakingTabs
            stakingProvider={stakingProvider}
            selectedToken={selectedToken}
            vaultAddress={vaultAddress as `0x${string}`}
            balance={balance}
            withdrawableAmount={vault.withdrawableAmount ?? BigInt(0)}
            onTabChange={updateRelayFee}
            onStatusChange={handleStatusChange}
            position={position}
          />
        </>
      )}
    </div>
  )
} 