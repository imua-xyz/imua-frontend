import { EVMLSTToken, EVMNSTToken } from "@/types/tokens";
import { ReactNode } from "react";
import { useEVMWalletConnector } from "@/hooks/useEVMWalletConnector";
import { WalletConnectorContext } from "@/contexts/WalletConnectorContext";

interface EVMWalletProviderProps {
  token: EVMLSTToken | EVMNSTToken;
  children: ReactNode;
}

export function EVMWalletProvider({ token, children }: EVMWalletProviderProps) {
  const connector = useEVMWalletConnector(token);

  return (
    <WalletConnectorContext.Provider value={connector}>
      {children}
    </WalletConnectorContext.Provider>
  );
}
