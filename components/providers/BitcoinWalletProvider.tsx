import { useBitcoinWalletConnector } from "@/hooks/useBitcoinWalletConnector";
import { ReactNode } from "react";
import { WalletConnectorContext } from "@/contexts/WalletConnectorContext";

interface BitcoinWalletProviderProps {
  children: ReactNode;
}

export function BitcoinWalletProvider({
  children,
}: BitcoinWalletProviderProps) {
  const connector = useBitcoinWalletConnector();
  return (
    <WalletConnectorContext.Provider value={connector}>
      {children}
    </WalletConnectorContext.Provider>
  );
}
