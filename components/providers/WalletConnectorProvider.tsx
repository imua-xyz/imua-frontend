// components/new-staking/providers/StakingServiceProvider.tsx
import { ReactNode } from "react";
import {
  Token,
  exoETH,
  wstETH,
  xrp,
  btc,
  tbtc,
  ethNSTlocal,
  EVMLSTToken,
  EVMNSTToken,
  ethNSTHoodi,
} from "@/types/tokens";
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
  // Render the appropriate provider based on token reference equality
  if (token === exoETH || token === wstETH) {
    return (
      <EVMWalletProvider token={token as EVMLSTToken}>
        {children}
      </EVMWalletProvider>
    );
  }

  if (token === ethNSTlocal || token === ethNSTHoodi) {
    return (
      <EVMWalletProvider token={token as EVMNSTToken}>
        {children}
      </EVMWalletProvider>
    );
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
