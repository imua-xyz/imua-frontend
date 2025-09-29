// components/new-staking/providers/StakingServiceProvider.tsx
import { ReactNode } from "react";
import { Token, exoETH, wstETH, xrp, ethNSTlocal, EVMLSTToken, EVMNSTToken, ethNSTHoodi } from "@/types/tokens";
import { EVMWalletProvider } from "./EVMWalletProvider";
import { XRPWalletProvider } from "./XRPWalletProvider";

interface WalletConnectorProviderProps {
  token: Token;
  children: ReactNode;
}

export function WalletConnectorProvider({
  token,
  children,
}: WalletConnectorProviderProps) {
  // Render the appropriate provider based on token
  if (token.address === exoETH.address || token.address === wstETH.address) {
    return <EVMWalletProvider token={token as EVMLSTToken}>{children}</EVMWalletProvider>;
  }

  if (token.address === ethNSTlocal.address || token.address === ethNSTHoodi.address) {
    return <EVMWalletProvider token={token as EVMNSTToken}>{children}</EVMWalletProvider>;
  }

  if (token.address === xrp.address) {
    return <XRPWalletProvider>{children}</XRPWalletProvider>;
  }

  // Fallback for unsupported tokens
  return <div>Unsupported token: {token.symbol}</div>;
}