import { useWhitelistedTokens } from '@/hooks/useWhitelistedTokens'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StakingContext } from '@/types/staking'
interface TokenSelectorProps {
  selectedToken?: `0x${string}`
  onSelect: (token: `0x${string}`) => void
  stakingContext: StakingContext
}

export function TokenSelector({ selectedToken, onSelect, stakingContext }: TokenSelectorProps) {
  if (stakingContext.isLoading) return <div>Loading tokens...</div>

  return (
    <div className="relative">
      <Select 
        value={selectedToken || undefined}
        onValueChange={(value) => onSelect(value as `0x${string}`)}
        disabled={!stakingContext.isConnected}
      >
        <SelectTrigger>
          <SelectValue placeholder={stakingContext.isConnected ? "Select a token" : "Connect wallet to continue"} />
        </SelectTrigger>
        <SelectContent>
          {stakingContext.whitelistedTokens?.map((token) => (
            <SelectItem key={token.address} value={token.address}>
              {token.symbol} ({token.name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!stakingContext.isConnected && (
        <p className="text-sm text-yellow-600 mt-2">
          Please connect your wallet to start staking
        </p>
      )}
    </div>
  )
} 