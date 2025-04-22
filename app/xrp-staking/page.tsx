"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount } from "wagmi";
import { AllStakingPositions } from "@/components/AllStakingPostions";
import { XRPStaking } from "@/components/Staking/xrp/XRPStaking";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useXRPContextProvider } from "@/hooks/useXRPContextProvider";
import { useXrpStakingProvider } from "@/hooks/useXrpStakingProvider";

export default function XRPStakingPage() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const stakingContext = useXRPContextProvider();
  const stakingProvider = useXrpStakingProvider(stakingContext);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4">
        <div className="mb-4">
          <Link href="/" passHref>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              Back to Home
            </Button>
          </Link>
        </div>

        {!stakingContext.isInstalled ? (
          <Card>
            <CardContent className="text-center p-6">
              <h3 className="text-lg font-bold mb-2">GemWallet Not Detected</h3>
              <p className="mb-4">
                Please install GemWallet to use XRP staking features.
              </p>
              <Button
                onClick={() =>
                  window.open("https://gemwallet.app/download", "_blank")
                }
              >
                Install GemWallet
              </Button>
            </CardContent>
          </Card>
        ) : !stakingContext.isConnected ? (
          <Card>
            <CardContent className="text-center p-6">
              <h3 className="text-lg font-bold mb-2">
                Connect Your XRP Wallet
              </h3>
              <p className="mb-4">
                Please connect GemWallet to access XRP staking features.
              </p>
              <Button onClick={() => stakingContext.connect()}>
                Connect GemWallet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent>
                <XRPStaking
                  stakingContext={stakingContext}
                  stakingProvider={stakingProvider}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Staking Positions</CardTitle>
              </CardHeader>
              <CardContent>
                {address && isConnected && <AllStakingPositions />}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
