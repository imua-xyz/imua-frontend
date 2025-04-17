"use client"

import { useState, useEffect } from 'react'
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccount } from 'wagmi'
import { AllStakingPositions } from "@/components/AllStakingPostions"
import { EVMStaking } from "@/components/Staking/evm/EVMStaking"

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()

  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return null

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
              <EVMStaking/>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Staking Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {address && isConnected && (
                <AllStakingPositions />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
