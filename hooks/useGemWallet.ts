'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatXrpAmount } from '@/lib/xrp-utils';
import { getAddress, getNetwork, sendPayment, isInstalled, Network } from '@gemwallet/api';
import { useXrplClient } from './useXrplClient';

// Type for the GemWallet response
type GemWalletResponse = {
  success: boolean;
  error?: string;
  xrpAddress?: string;
  data?: any;
};

export interface WalletNetwork {
    chain: string;
    network: Network;
    websocket: string;
} 

/**
 * Hook for managing GemWallet connection and session
 */
export function useGemWallet() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [walletNetwork, setWalletNetwork] = useState<WalletNetwork | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [installed, setInstalled] = useState(false);
  const xrplClient = useXrplClient();

  // Fetch XRP balance using xrplClient
  const fetchBalance = useCallback(async (address: string) => {
    if (!address) return;
    
    try {
      // Use xrplClient to get account info
      const accountInfo = await xrplClient.getAccountInfo(address);
      
      if (accountInfo.success && accountInfo.data) {
        setBalance(accountInfo.data.balance);
      } else {
        setBalance(null);
      }
    } catch (error) {
      console.error('Error fetching XRP balance:', error);
      setBalance(null);
    }
  }, [xrplClient]);

  // Check for existing session
  const checkSession = useCallback(async () => {
    if (!installed) return;
    
    try {
      // Check for existing session in localStorage
      const storedSession = localStorage.getItem('gemwallet-session');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        if (session.userAddress && new Date(session.expiresAt) > new Date()) {
          // Verify the address is still available in GemWallet
          try {
            const currentAddress = await getAddress();
            if (currentAddress === session.userAddress) {
              setIsWalletConnected(true);
              setUserAddress(session.userAddress);
              setWalletNetwork(session.network);
              fetchBalance(session.userAddress);
              return;
            }
          } catch (error) {
            // Error getting address, user may have disconnected
            console.log('Error verifying GemWallet address:', error);
          }
        }
        // Session expired or address changed
        localStorage.removeItem('gemwallet-session');
        setIsWalletConnected(false);
        setUserAddress(null);
        setWalletNetwork(undefined);
      }
    } catch (error) {
      console.error('Error checking GemWallet session:', error);
    }
  }, [installed, fetchBalance]);

  // Check if GemWallet is installed by checking window.gem object
  useEffect(() => {
    const checkInstallation = async () => {
      try {
        const installed = await isInstalled();
        setInstalled(installed.result.isInstalled);
      } catch (error) {
        console.error('Error checking GemWallet installation:', error);
        setInstalled(false);
      }
    };

    checkInstallation();
    
    // Only set up polling if installed (no need to check window again)
    if (installed) {
      const intervalId = setInterval(checkSession, 30000); // every 30 seconds
      return () => clearInterval(intervalId);
    }
  }, [installed, checkSession]);

  // Connect to GemWallet
  const connect = useCallback(async (): Promise<GemWalletResponse> => {
    if (!installed) return { success: false, error: 'GemWallet is not installed' };
    
    setIsLoading(true);
    
    try {
      // Get user address from GemWallet
      const addressResponse = await getAddress();
      const address = addressResponse.result?.address;
      
      if (!address) {
        return { 
          success: false, 
          error: 'Failed to get address' 
        };
      }

      // Get network information and map to config
      const networkResponse = await getNetwork();
      const network = networkResponse.result;
      
      // Store session with network config
      const session = {
        userAddress: address,
        network,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      localStorage.setItem('gemwallet-session', JSON.stringify(session));
      
      setIsWalletConnected(true);
      setUserAddress(address);
      setWalletNetwork(network);
      await fetchBalance(address);
      
      return { 
        success: true, 
        xrpAddress: address,
        data: network
      };
    } catch (error) {
      console.error('Error connecting to GemWallet:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error connecting to GemWallet' 
      };
    } finally {
      setIsLoading(false);
    }
  }, [installed, fetchBalance]);

  // Disconnect from GemWallet
  const disconnect = useCallback(async (): Promise<GemWalletResponse> => {
    try {
      // Remove the session from localStorage
      localStorage.removeItem('gemwallet-session');
      
      setIsWalletConnected(false);
      setUserAddress(null);
      setBalance(null);
      setWalletNetwork(undefined);
      
      return { success: true };
    } catch (error) {
      console.error('Error disconnecting from GemWallet:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error disconnecting from GemWallet' 
      };
    }
  }, []);

  // Send a payment via GemWallet
  const sendTransaction = useCallback(async (transaction: any): Promise<GemWalletResponse> => {
    if (!installed || !isWalletConnected) {
      return { success: false, error: 'GemWallet not connected' };
    }
    
    try {
      // For Payment transactions
      if (transaction.TransactionType === 'Payment') {
        const payment = {
          amount: transaction.Amount,
          destination: transaction.Destination
        };
        
        const hash = await sendPayment(payment);
        
        if (hash === null) {
          return { success: false, error: 'User refused the payment' };
        }
        
        if (!hash) {
          return { success: false, error: 'Failed to send payment' };
        }
        
        return {
          success: true,
          xrpAddress: userAddress || undefined,
          data: {
            hash
          }
        };
      } else {
        // For other transaction types, would need to use submitTransaction
        // This part would need to be implemented once GemWallet adds support for other transaction types
        return {
          success: false,
          error: 'Only Payment transactions are supported at this time'
        };
      }
    } catch (error) {
      console.error('Error sending transaction via GemWallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending transaction'
      };
    }
  }, [installed, isWalletConnected, userAddress]);

  // Return the hook interface
  return {
    installed,
    isConnected: isWalletConnected,
    userAddress,
    balance,
    network: walletNetwork,
    isLoading,
    connect,
    disconnect,
    fetchBalance,
    sendTransaction,
    formattedBalance: balance ? formatXrpAmount(balance) : null
  };
} 