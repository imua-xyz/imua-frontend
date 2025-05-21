// app/xrp-staking/page.tsx - Updated to enforce Testnet
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AllStakingPositions } from "@/components/AllStakingPostions";
import { XRPStaking } from "@/components/Staking/xrp/XRPStaking";
import { useXRPContextProvider } from "@/hooks/useXRPContextProvider";
import { useXrpStakingProvider } from "@/hooks/useXrpStakingProvider";
import { XRP_CHAIN_ID } from "@/config/xrp";
import { GemWalletDisplay } from "@/components/Staking/xrp/GemWalletDisplay";
import { Header } from "@/components/layout/header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Wallet, WalletIcon } from "lucide-react";

// Separate component for mounted state to fix hydration issue
function MountedXRPStakingPage() {
  const { address, isConnected: isEthWalletConnected } = useAccount();
  const stakingContext = useXRPContextProvider();
  const stakingProvider = useXrpStakingProvider(stakingContext);

  // Check if connected to Testnet
  const isTestnet = stakingContext.network?.network === "Testnet";
  const correctNetwork = isTestnet;

  // Only count as connected if on the correct network
  const isGemWalletConnectedOnTestnet =
    stakingContext.isGemWalletConnected && correctNetwork;
  const bothWalletsConnected =
    isEthWalletConnected && isGemWalletConnectedOnTestnet;

  return (
    <div>
      {/* Keep the standard header for Ethereum wallet */}
      <Header />

      {/* Breadcrumb navigation */}
      <div className="border-b">
        <div className="container mx-auto py-2">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "XRP Staking" }]}
          />
        </div>
      </div>

      {/* XRP wallet display and page header */}
      <div className="container mx-auto flex justify-between items-center py-4">
        <h1 className="text-2xl font-bold">XRP Staking</h1>

        <div className="flex items-center">
          <span className="mr-2 font-medium">XRP Wallet:</span>
          <GemWalletDisplay />
        </div>
      </div>

      <main className="container mx-auto">
        {/* Connection Status Cards */}
        {(!isGemWalletConnectedOnTestnet || !isEthWalletConnected) && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ethereum Wallet Connection */}
              <Card
                className={
                  isEthWalletConnected
                    ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/10"
                    : ""
                }
              >
                <CardContent className="text-center p-6">
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet
                        className={`w-6 h-6 ${isEthWalletConnected ? "text-green-500" : "text-primary"}`}
                      />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2">
                    {isEthWalletConnected
                      ? "Ethereum Wallet Connected"
                      : "Connect Ethereum Wallet"}
                  </h3>
                  <p className="mb-4 text-muted-foreground">
                    {isEthWalletConnected
                      ? "Your Ethereum wallet is successfully connected."
                      : "Ethereum wallet is required for cross-chain staking."}
                  </p>

                  {!isEthWalletConnected && (
                    <div className="flex justify-center">
                      <ConnectButton />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* GemWallet Connection */}
              <Card
                className={
                  isGemWalletConnectedOnTestnet
                    ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/10"
                    : ""
                }
              >
                <CardContent className="text-center p-6">
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-purple-600/10 flex items-center justify-center">
                      <WalletIcon
                        className={`w-6 h-6 ${isGemWalletConnectedOnTestnet ? "text-green-500" : "text-purple-600"}`}
                      />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2">
                    {isGemWalletConnectedOnTestnet
                      ? "XRP Testnet Wallet Connected"
                      : "Connect XRP Testnet Wallet"}
                  </h3>

                  {!stakingContext.isInstalled ? (
                    <div>
                      <p className="mb-4 text-muted-foreground">
                        Please install GemWallet to use XRP staking features.
                      </p>
                      <Button
                        onClick={() =>
                          window.open(
                            "https://gemwallet.app/download",
                            "_blank",
                          )
                        }
                      >
                        Install GemWallet
                      </Button>
                    </div>
                  ) : stakingContext.isGemWalletConnected && !isTestnet ? (
                    <div>
                      <p className="mb-4 text-rose-500">
                        You are connected to{" "}
                        {stakingContext.network?.network || "unknown network"}.
                        Please switch to Testnet in GemWallet.
                      </p>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          onClick={stakingContext.disconnect}
                        >
                          Disconnect
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          After switching to Testnet in GemWallet, reconnect
                          here.
                        </p>
                      </div>
                    </div>
                  ) : isGemWalletConnectedOnTestnet ? (
                    <p className="mb-4 text-muted-foreground">
                      Your XRP Testnet wallet is successfully connected.
                    </p>
                  ) : (
                    <div>
                      <p className="mb-4 text-muted-foreground">
                        Please connect your GemWallet on{" "}
                        <span className="font-medium">Testnet</span>. Only
                        Testnet is supported.
                      </p>
                      <Button onClick={stakingContext.connect}>
                        Connect GemWallet
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Progress Indicator for Wallet Connection */}
        {!bothWalletsConnected && (
          <div className="mb-8 flex justify-center">
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Connection Progress</span>
                <span className="text-sm text-muted-foreground">
                  {isEthWalletConnected && isGemWalletConnectedOnTestnet
                    ? "Complete"
                    : isEthWalletConnected || isGemWalletConnectedOnTestnet
                      ? "1/2"
                      : "0/2"}
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-in-out"
                  style={{
                    width: `${(isEthWalletConnected ? 50 : 0) + (isGemWalletConnectedOnTestnet ? 50 : 0)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Staking Interface - Only shown when both wallets are connected */}
        {bothWalletsConnected && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
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
                {address && (
                  <AllStakingPositions
                    userAddress={address}
                    lzEndpointIdOrCustomChainId={XRP_CHAIN_ID}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

// Main component with hydration fix
export default function XRPStakingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <MountedXRPStakingPage />;
}
