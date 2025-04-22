import { useState } from "react";
import { StakingContext, StakingProvider, TxStatus } from "@/types/staking";
import { TokenSelector } from "./TokenSelector";
import { TokenInfo } from "./TokenInfo";
import { StakingTabs } from "./StakingTabs";
import { getAvailableNetworks } from "@/config/stakingPortals";

interface BaseStakingProps {
  selectedToken?: `0x${string}`;
  onTokenSelect: (token: `0x${string}`) => void;
  stakingContext: StakingContext;
  stakingProvider: StakingProvider;
}

export function BaseStaking({
  selectedToken,
  onTokenSelect,
  stakingContext,
  stakingProvider,
}: BaseStakingProps) {
  const [relayFee, setRelayFee] = useState<bigint>(BigInt(0));
  console.log("DEBUG: selectedToken", selectedToken);
  console.log("DEBUG: is connected", stakingProvider.isWalletConnected);
  console.log("DEBUG: is staking enabled", stakingProvider.isStakingEnabled);

  // Update relay fee when tab changes or operation type changes
  const updateRelayFee = async (operationType: "delegation" | "asset") => {
    if (!stakingProvider) return;
    const fee = await stakingProvider.getQuote(operationType);
    setRelayFee(fee);
  };

  // Handle transaction status changes
  const handleStatusChange = (status: TxStatus, error?: string) => {
    console.log("Transaction status:", status, error);
  };

  // Get available networks for display
  const availableNetworks = getAvailableNetworks();

  return (
    <div className="space-y-6">
      <TokenSelector
        selectedToken={selectedToken}
        onSelect={onTokenSelect}
        stakingContext={stakingContext}
      />

      {/* Wallet not connected message */}
      {!stakingContext.isConnected && (
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-yellow-800">
            Please connect your wallet to access staking features.
          </p>
        </div>
      )}

      {/* Connected but staking not enabled message */}
      {stakingContext.isConnected && !stakingContext.isStakingEnabled && (
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-yellow-800">
            {"Staking is not available on the current network."}
          </p>
          {availableNetworks.length > 0 && (
            <>
              <p className="text-yellow-700 mt-2">
                Please switch to one of these supported networks:
              </p>
              <div className="mt-2">
                <ul className="list-disc pl-5 text-yellow-800">
                  {availableNetworks.map((networkName) => (
                    <li key={networkName}>{networkName}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      {/* Staking UI when everything is enabled */}
      {stakingProvider.isWalletConnected &&
        stakingProvider.isStakingEnabled &&
        selectedToken && (
          <>
            <TokenInfo
              stakingProvider={stakingProvider}
              token={selectedToken}
              relayFee={relayFee}
            />

            <StakingTabs
              stakingProvider={stakingProvider}
              selectedToken={selectedToken}
              onTabChange={updateRelayFee}
              onStatusChange={handleStatusChange}
            />
          </>
        )}
    </div>
  );
}
