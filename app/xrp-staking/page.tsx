// app/xrp-staking/page.tsx - Updated with Imua network check and guide
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount, useSwitchChain } from "wagmi";
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
import {
  AlertCircle,
  ChevronRight,
  Plus,
  Wallet,
  WalletIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { imua } from "@/config/wagmi";

// Separate component for mounted state to fix hydration issue
function MountedXRPStakingPage() {
  const { address, chain, isConnected: isEthWalletConnected } = useAccount();
  const { switchChain, status: switchChainStatus } = useSwitchChain();
  const stakingContext = useXRPContextProvider();
  const stakingProvider = useXrpStakingProvider(stakingContext);
  const [isAddNetworkDialogOpen, setIsAddNetworkDialogOpen] = useState(false);

  // Check if connected to Imua network
  const isImuaNetwork = chain?.id === imua.id;

  // Check if connected to XRP Testnet
  const isXrpTestnet = stakingContext.network?.network === "Testnet";
  const correctXrpNetwork = isXrpTestnet;

  // Check if the bound address exists and matches the connected wallet
  const boundImuaAddress = stakingContext.boundImuaAddress;
  const isCorrectWalletAddress =
    !boundImuaAddress || // No bound address yet, any wallet is acceptable
    (address && address.toLowerCase() === boundImuaAddress.toLowerCase()); // Wallet matches bound address

  // Only count as connected if on the correct networks and using the correct wallet address
  const isGemWalletConnectedOnTestnet =
    stakingContext.isGemWalletConnected && correctXrpNetwork;
  const bothWalletsConnected =
    isEthWalletConnected &&
    isImuaNetwork &&
    isGemWalletConnectedOnTestnet &&
    isCorrectWalletAddress;

  // Handler to add Imua network to MetaMask
  const addImuaNetworkToMetaMask = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${imua.id.toString(16)}`,
              chainName: imua.name,
              nativeCurrency: {
                name: imua.nativeCurrency.name,
                symbol: imua.nativeCurrency.symbol,
                decimals: 18,
              },
              rpcUrls: [imua.rpcUrls.default.http[0]],
              blockExplorerUrls: ["https://exoscan.org/"],
            },
          ],
        });
        setIsAddNetworkDialogOpen(false);
      } catch (error) {
        console.error("Error adding Imua network to MetaMask:", error);
      }
    }
  };

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
        {(!isGemWalletConnectedOnTestnet ||
          !isEthWalletConnected ||
          !isImuaNetwork) && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ethereum Wallet Connection */}
              <Card
                className={
                  isEthWalletConnected &&
                  boundImuaAddress &&
                  !isCorrectWalletAddress
                    ? "border-red-500/30 bg-red-50/30 dark:bg-red-950/10"
                    : isEthWalletConnected &&
                        isImuaNetwork &&
                        isCorrectWalletAddress
                      ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/10"
                      : isEthWalletConnected && !isImuaNetwork
                        ? "border-yellow-500/30 bg-yellow-50/30 dark:bg-yellow-950/10"
                        : ""
                }
              >
                <CardContent className="text-center p-6">
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet
                        className={`w-6 h-6 ${
                          isEthWalletConnected &&
                          boundImuaAddress &&
                          !isCorrectWalletAddress
                            ? "text-red-500"
                            : isEthWalletConnected &&
                                isImuaNetwork &&
                                isCorrectWalletAddress
                              ? "text-green-500"
                              : isEthWalletConnected && !isImuaNetwork
                                ? "text-yellow-500"
                                : "text-primary"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Different states based on connection */}
                  {!isEthWalletConnected ? (
                    <>
                      <h3 className="text-lg font-bold mb-2">
                        Connect Ethereum Wallet
                      </h3>
                      <p className="mb-4 text-muted-foreground">
                        Ethereum wallet is required for cross-chain staking.
                      </p>
                      <div className="flex justify-center">
                        <ConnectButton />
                      </div>
                    </>
                  ) : boundImuaAddress && !isCorrectWalletAddress ? (
                    <>
                      <h3 className="text-lg font-bold mb-2">
                        Wrong Wallet Address
                      </h3>
                      <p className="mb-4 text-rose-500">
                        This XRP address is already bound to a different Imua
                        address. Please connect the wallet with address:
                      </p>
                      <div className="p-2 bg-muted rounded-md mb-4 break-all text-xs">
                        {boundImuaAddress}
                      </div>
                      <div className="flex justify-center">
                        <ConnectButton />
                      </div>
                    </>
                  ) : !isImuaNetwork ? (
                    <>
                      <h3 className="text-lg font-bold mb-2">
                        Switch to Imua Network
                      </h3>
                      <p className="mb-4 text-muted-foreground">
                        Please switch your wallet to the Imua network to
                        continue.
                      </p>
                      <div className="flex flex-col gap-2 items-center">
                        {switchChain ? (
                          <Button
                            onClick={() => switchChain({ chainId: imua.id })}
                            disabled={switchChainStatus === "pending"}
                          >
                            {switchChainStatus === "pending"
                              ? "Switching..."
                              : "Switch to Imua Network"}
                          </Button>
                        ) : (
                          <Dialog
                            open={isAddNetworkDialogOpen}
                            onOpenChange={setIsAddNetworkDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Imua Network
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>
                                  Add Imua Network to MetaMask
                                </DialogTitle>
                                <DialogDescription>
                                  Configure your wallet with the Imua network
                                  details below.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label
                                    htmlFor="network-name"
                                    className="text-right"
                                  >
                                    Network
                                  </Label>
                                  <Input
                                    id="network-name"
                                    value={imua.name}
                                    className="col-span-3"
                                    readOnly
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label
                                    htmlFor="rpc-url"
                                    className="text-right"
                                  >
                                    RPC URL
                                  </Label>
                                  <Input
                                    id="rpc-url"
                                    value={imua.rpcUrls.default.http[0]}
                                    className="col-span-3"
                                    readOnly
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label
                                    htmlFor="chain-id"
                                    className="text-right"
                                  >
                                    Chain ID
                                  </Label>
                                  <Input
                                    id="chain-id"
                                    value={imua.id}
                                    className="col-span-3"
                                    readOnly
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label
                                    htmlFor="symbol"
                                    className="text-right"
                                  >
                                    Symbol
                                  </Label>
                                  <Input
                                    id="symbol"
                                    value={imua.nativeCurrency.symbol}
                                    className="col-span-3"
                                    readOnly
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label
                                    htmlFor="explorer"
                                    className="text-right"
                                  >
                                    Explorer
                                  </Label>
                                  <Input
                                    id="explorer"
                                    value={"https://exoscan.org/"}
                                    className="col-span-3"
                                    readOnly
                                  />
                                </div>
                              </div>
                              <DialogFooter className="sm:justify-center">
                                <Button
                                  type="button"
                                  onClick={addImuaNetworkToMetaMask}
                                >
                                  Add to MetaMask
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() =>
                                    setIsAddNetworkDialogOpen(false)
                                  }
                                >
                                  Cancel
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">
                          {chain
                            ? `Currently on: ${chain.name} (Chain ID: ${chain.id})`
                            : "No network detected"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold mb-2">
                        Ethereum Wallet Connected
                      </h3>
                      <p className="mb-4 text-muted-foreground">
                        Your Ethereum wallet is successfully connected to the
                        Imua network.
                      </p>
                    </>
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
                            "https://chromewebstore.google.com/detail/gemwallet/egebedonbdapoieedfcfkofloclfghab",
                            "_blank",
                          )
                        }
                      >
                        Install GemWallet
                      </Button>
                    </div>
                  ) : stakingContext.isGemWalletConnected && !isXrpTestnet ? (
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

        {/* Connection explanation */}
        {!bothWalletsConnected && (
          <Alert className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Why do I need to connect two wallets?</AlertTitle>
            <AlertDescription>
              <p className="mt-2">
                XRP staking requires both wallets for cross-chain operations:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>
                  <span className="font-medium">XRP Wallet (GemWallet):</span>{" "}
                  For sending XRP deposits
                </li>
                <li>
                  <span className="font-medium">
                    Ethereum Wallet on Imua Network:
                  </span>{" "}
                  For delegation, undelegation, and withdrawal operations
                </li>
              </ul>
              <p className="mt-2">
                Your first deposit will bind your XRP address to your Imua
                address, enabling cross-chain operations.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Indicator for Wallet Connection */}
        {!bothWalletsConnected && (
          <div className="mb-8 flex justify-center">
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Connection Progress</span>
                <span className="text-sm text-muted-foreground">
                  {isEthWalletConnected &&
                  isImuaNetwork &&
                  isCorrectWalletAddress &&
                  isGemWalletConnectedOnTestnet
                    ? "Complete"
                    : `${
                        (isEthWalletConnected &&
                        isImuaNetwork &&
                        isCorrectWalletAddress
                          ? 1
                          : 0) + (isGemWalletConnectedOnTestnet ? 1 : 0)
                      }/2`}
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-in-out"
                  style={{
                    width: `${
                      (isEthWalletConnected &&
                      isImuaNetwork &&
                      isCorrectWalletAddress
                        ? 50
                        : 0) + (isGemWalletConnectedOnTestnet ? 50 : 0)
                    }%`,
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
