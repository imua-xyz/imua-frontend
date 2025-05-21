import { useState } from "react";
import { Card } from "@/components/ui/card";
import { BaseStaking } from "../core/BaseStaking";
import { useLSTStakingProvider } from "@/hooks/useLSTStakingProvider";
import { useLSTContextProvider } from "@/hooks/useLSTContextProvider";

export function EVMStaking() {
  const stakingContext = useLSTContextProvider();

  const [selectedToken, setSelectedToken] = useState<`0x${string}` | undefined>(
    undefined,
  );
  const stakingProvider = useLSTStakingProvider(selectedToken);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">EVM Staking</h2>
      <BaseStaking
        selectedToken={selectedToken}
        onTokenSelect={setSelectedToken}
        stakingContext={stakingContext}
        stakingProvider={stakingProvider}
        sourceChain={"evm"}
      />
    </Card>
  );
}
