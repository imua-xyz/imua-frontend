import { useXRPWalletConnector } from "@/hooks/useXRPWalletConnector";

import { ReactNode } from "react";

import { WalletConnectorContext } from "@/contexts/WalletConnectorContext";

interface XRPWalletProviderProps {
    children: ReactNode;
}

export function XRPWalletProvider({ children }: XRPWalletProviderProps) {
    const connector = useXRPWalletConnector();
    return <WalletConnectorContext.Provider value={connector}>{children}</WalletConnectorContext.Provider>
}           