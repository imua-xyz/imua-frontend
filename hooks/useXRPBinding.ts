// hooks/useXRPBinding.ts
import { useEffect } from 'react';
import { useGemWalletStore } from '@/stores/gemWalletClient';
import { useBindingStore, bindingClient } from '@/stores/bindingClient';
import { useUTXOGateway } from '@/hooks/useUTXOGateway';

export function useXRPBinding() {
  const { contract } = useUTXOGateway();
  
  // Get XRP wallet state
  const xrpAddress = useGemWalletStore(state => state.userAddress);
  const isConnected = useGemWalletStore(state => state.isWalletConnected);
  
  // Get binding state for this address
  const boundAddress = useBindingStore(state => 
    xrpAddress ? state.boundAddresses[xrpAddress] : undefined
  );
  
  // Set up contract in binding client
  useEffect(() => {
    if (contract) {
      bindingClient.setContract(contract);
    }
  }, [contract]);
  
  // Check binding on connection changes
  useEffect(() => {
    if (isConnected && xrpAddress && contract && boundAddress === undefined) {
      bindingClient.checkBinding(xrpAddress);
    }
  }, [isConnected, xrpAddress, contract, boundAddress]);
}