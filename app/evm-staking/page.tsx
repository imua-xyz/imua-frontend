"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount } from "wagmi";
import { AllStakingPositions } from "@/components/AllStakingPostions";
import { EVMStaking } from "@/components/Staking/evm/EVMStaking";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCustomChainIdByEvmChainID } from "@/config/stakingPortals";

export default function EVMStakingPage() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected, chainId } = useAccount();
  const customChainId = getCustomChainIdByEvmChainID(chainId as number);

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent>
              <EVMStaking />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Staking Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {address && isConnected && customChainId && (
                <AllStakingPositions
                  userAddress={address}
                  lzEndpointIdOrCustomChainId={customChainId}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
