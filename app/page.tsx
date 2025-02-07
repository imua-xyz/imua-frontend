"use client"

import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Staking } from "@/components/Staking/index"
import { StakingPositions } from "@/components/StakingPositions"
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

export default function Home() {
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | null>(null)
  const [mounted, setMounted] = useState(false)
  const { isConnected } = useAccount()

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null // Return null on server/initial render
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
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Staking Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedToken && isConnected && (
                <StakingPositions tokenAddress={selectedToken} />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
