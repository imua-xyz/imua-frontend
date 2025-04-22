import { useState } from "react";
import { Card } from "@/components/ui/card";
import { BaseStaking } from "../core/BaseStaking";
import { XRPStakingContext, StakingProvider } from "@/types/staking";

interface XRPStakingProps {
  stakingContext: XRPStakingContext;
  stakingProvider: StakingProvider;
}

export function XRPStaking({
  stakingContext,
  stakingProvider,
}: XRPStakingProps) {
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | undefined>(
    undefined,
  );

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">XRP Staking</h2>
      <BaseStaking
        selectedToken={selectedToken}
        onTokenSelect={setSelectedToken}
        stakingContext={stakingContext}
        stakingProvider={stakingProvider}
      />
    </Card>
  );
}
