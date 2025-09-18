// components/new-staking/providers/StakingServiceProvider.tsx
import { ReactNode } from "react";
import { Token, exoETH, wstETH, xrp, btc, tbtc } from "@/types/tokens";
import { EVMWalletProvider } from "./EVMWalletProvider";
import { XRPWalletProvider } from "./XRPWalletProvider";
import { BitcoinWalletProvider } from "./BitcoinWalletProvider";

interface WalletConnectorProviderProps {
  token: Token;
  children: ReactNode;
}

export function WalletConnectorProvider({
  token,
  children,
}: WalletConnectorProviderProps) {
  // Render the appropriate provider based on token
  if (token === exoETH || token === wstETH) {
    return <EVMWalletProvider token={token}>{children}</EVMWalletProvider>;
  }

  if (token === xrp) {
    return <XRPWalletProvider>{children}</XRPWalletProvider>;
  }

  if (token === btc || token === tbtc) {
    return <BitcoinWalletProvider>{children}</BitcoinWalletProvider>;
  }

  // Fallback for unsupported tokens
  return <div>Unsupported token: {token.symbol}</div>;
}
