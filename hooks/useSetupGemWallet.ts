// hooks/useSetupGemWallet.ts
import { useEffect } from 'react';
import { useUTXOGateway } from '@/hooks/useUTXOGateway';
import { gemWalletClient } from '@/stores/gemWalletClient';

export function useSetupGemWallet() {
  const { contract } = useUTXOGateway();
  
  // Set the contract reference in the client
  useEffect(() => {
    if (contract) {
      gemWalletClient.setContract(contract);
    }
  }, [contract]);
  
  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      // No need to clean up on component unmount,
      // we want polling to continue
    };
  }, []);
}