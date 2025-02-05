"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Staking } from "@/components/Staking"
import { StakingPositions } from "@/components/StakingPositions"
import { useState } from 'react'

export default function Home() {
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | null>(null)

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Restake Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <Staking onTokenSelect={setSelectedToken} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Staking Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedToken && (
                <StakingPositions tokenAddress={selectedToken} />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
