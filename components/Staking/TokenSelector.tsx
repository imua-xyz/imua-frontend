import { useWhitelistedTokens } from '@/hooks/useWhitelistedTokens'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TokenSelectorProps {
  selectedToken: `0x${string}` | null
  onSelect: (token: `0x${string}`) => void
  isConnected: boolean
}

export function TokenSelector({ selectedToken, onSelect, isConnected }: TokenSelectorProps) {
  const { tokens, isLoading } = useWhitelistedTokens()

  if (isLoading) return <div>Loading tokens...</div>

  return (
    <div className="relative">
      <Select 
        value={selectedToken || undefined}
        onValueChange={(value) => onSelect(value as `0x${string}`)}
        disabled={!isConnected}
      >
        <SelectTrigger>
          <SelectValue placeholder={isConnected ? "Select a token" : "Connect wallet to continue"} />
        </SelectTrigger>
        <SelectContent>
          {tokens?.map((token) => (
            <SelectItem key={token.address} value={token.address}>
              {token.symbol} ({token.name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!isConnected && (
        <p className="text-sm text-yellow-600 mt-2">
          Please connect your wallet to start staking
        </p>
      )}
    </div>
  )
} 