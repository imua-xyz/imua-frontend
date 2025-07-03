// contexts/StakingServiceContext.tsx
import { createContext, useContext } from 'react';
import { WalletConnector } from '@/types/wallet-connector';

export const WalletConnectorContext = createContext<WalletConnector | null>(null);

export function useWalletConnectorContext() {
  const context = useContext(WalletConnectorContext);
  if (!context) {
    throw new Error('useWalletConnectorContext must be used within a WalletConnectorProvider');
  }
  return context;
}