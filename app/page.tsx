"use client"

import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Staking } from "@/components/Staking/index"
import { StakingPositions } from "@/components/StakingPositions"
import { useStakingPosition, StakingPosition } from "@/hooks/useStakingPosition"
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { getAccount } from '@wagmi/core'
import { config, CHAIN_ID_TO_ENDPOINT } from '@/config/wagmi'

export default function Home() {
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | null>(null)
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()
  const { chainId } = getAccount(config)
  const chain = config.chains.find(chain => chain.id === chainId)
  const lzEndpointId = chainId ? CHAIN_ID_TO_ENDPOINT[chainId as keyof typeof CHAIN_ID_TO_ENDPOINT] : undefined
  const { data: positions, isLoading, error } = useStakingPosition(address as `0x${string}`, lzEndpointId as number)

  const findMatchingPosition = (token: `0x${string}` | null) => {
    if (!positions || !token || !lzEndpointId) return undefined
    return positions.find(
      pos => pos.tokenAddress.toLowerCase() === token.toLowerCase() && 
             pos.lzEndpointId === lzEndpointId.toString()
    )
  }

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Staking Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Staking 
                onTokenSelect={setSelectedToken}
                chain={chain}
                position={findMatchingPosition(selectedToken) as StakingPosition}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Staking Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {address && isConnected && lzEndpointId && (
                <StakingPositions 
                  positions={positions}
                  isLoading={isLoading}
                  error={error}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
