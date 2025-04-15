'use client';

import { useState, useEffect, useCallback } from 'react';
import { dropsToXrp, xrpToDrops, generateDestinationTag } from '@/lib/xrp-utils';
import { WalletNetwork } from './useGemWallet';
import { 
  Client, 
  Wallet, 
  convertStringToHex,
  Payment,
  SubmittableTransaction
} from 'xrpl';

// Types for XRPL responses and transactions
type XrplResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

type XrplTransactionType = 
  | 'Payment' 
  | 'EscrowCreate' 
  | 'EscrowFinish' 
  | 'EscrowCancel'
  | 'TrustSet';

type XrplTransactionStatus = 'pending' | 'validated' | 'failed';

/**
 * Hook for interacting with the XRP Ledger
 */
export function useXrplClient(networkParam?: WalletNetwork) {
  const [client, setClient] = useState<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<string>('Testnet'); // Default fallback

  // Initialize and connect to XRPL
  useEffect(() => {
    let isMounted = true;
    
    const initClient = async () => {
      try {
        setIsConnecting(true);
        
        // Disconnect existing client if there is one
        if (client) {
          await client.disconnect();
        }
        
        // Use the websocket URL directly from networkParam if available
        // Otherwise fall back to a default
        const websocketUrl = networkParam?.websocket || 'wss://s.altnet.rippletest.net:51233';
        
        // Initialize real XRPL client using the websocket URL
        const xrplClient = new Client(websocketUrl);
        await xrplClient.connect();
        
        if (isMounted) {
          setClient(xrplClient);
          setIsConnected(true);
          setError(null);
          
          // Update current network
          if (networkParam?.network) {
            setCurrentNetwork(networkParam.network);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to connect to XRPL:', err);
          setError(err instanceof Error ? err.message : 'Failed to connect to XRPL');
        }
      } finally {
        if (isMounted) {
          setIsConnecting(false);
        }
      }
    };
    
    initClient();
    
    return () => {
      isMounted = false;
      
      // Clean up - disconnect from XRPL
      if (client) {
        client.disconnect();
      }
    };
  }, [networkParam]); // Re-initialize when networkParam changes
  
  // Get account information
  const getAccountInfo = useCallback(async (address: string): Promise<XrplResponse> => {
    if (!client || !isConnected) {
      return { success: false, error: 'XRPL client not connected' };
    }
    
    try {
      const response = await client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });

      if (response.result && response.result.account_data) {
        const balance = dropsToXrp(response.result.account_data.Balance);
        
        return {
          success: true,
          data: {
            address,
            balance,
            sequence: response.result.account_data.Sequence
          }
        };
      } else {
        return {
          success: false,
          error: 'Invalid response from XRPL'
        };
      }
    } catch (error) {
      console.error('Error fetching account info:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error fetching account info' 
      };
    }
  }, [client, isConnected]);
  
  // Submit a transaction to the XRPL
  const submitTransaction = useCallback(async (
    transaction: SubmittableTransaction,
    wallet: Wallet
  ): Promise<XrplResponse> => {
    if (!client || !isConnected) {
      return { success: false, error: 'XRPL client not connected' };
    }
    
    try {
      // Prepare, sign and submit the transaction
      const prepared = await client.autofill(transaction);
      const signed = wallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);
      
      if (result.result.meta && typeof result.result.meta === 'object') {
        const resultCode = result.result.meta?.TransactionResult;
        const isSuccess = resultCode === 'tesSUCCESS';
        
        return {
          success: isSuccess,
          data: {
            hash: result.result.hash,
            status: isSuccess ? 'validated' as XrplTransactionStatus : 'failed' as XrplTransactionStatus,
            resultCode: resultCode
          },
          error: isSuccess ? undefined : `Transaction failed: ${resultCode}`
        };
      } else {
        return {
          success: false,
          error: 'Invalid transaction response'
        };
      }
    } catch (error) {
      console.error('Error submitting transaction:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error submitting transaction' 
      };
    }
  }, [client, isConnected]);
  
  // Check the status of a transaction
  const getTransactionStatus = useCallback(async (txHash: string): Promise<XrplResponse> => {
    if (!client || !isConnected) {
      return { success: false, error: 'XRPL client not connected' };
    }
    
    try {
      const result = await client.request({
        command: 'tx',
        transaction: txHash
      });
      
      if (result.result) {
        const validated = result.result.validated === true;
        
        if (validated) {
          const meta = result.result.meta;
          const resultCode = typeof meta === 'object' && meta !== null 
            ? (meta as any).TransactionResult 
            : 'unknown';
          const isSuccess = resultCode === 'tesSUCCESS';
          
          return {
            success: true,
            data: {
              status: isSuccess ? 'validated' as XrplTransactionStatus : 'failed' as XrplTransactionStatus,
              result: resultCode,
              ledgerIndex: result.result.ledger_index
            }
          };
        } else {
          return {
            success: true,
            data: {
              status: 'pending' as XrplTransactionStatus
            }
          };
        }
      } else {
        return {
          success: false,
          error: 'Transaction not found'
        };
      }
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error checking transaction status' 
      };
    }
  }, [client, isConnected]);
  
  // Create a payment transaction
  const createPaymentTransaction = useCallback((
    fromAddress: string,
    toAddress: string,
    amount: string, // in XRP
    memo?: { type: string; data: string; },
    destinationTag?: number
  ): Payment => {
    const amountInDrops = xrpToDrops(amount);
    const tx: Payment = {
      TransactionType: "Payment",
      Account: fromAddress,
      Destination: toAddress,
      Amount: amountInDrops,
      Fee: "12", // standard fee in drops
    };
    
    // Add destination tag if provided
    if (destinationTag !== undefined) {
      tx.DestinationTag = destinationTag;
    } else {
      // Generate a random destination tag
      tx.DestinationTag = generateDestinationTag();
    }
    
    // Add memo if provided
    if (memo) {
      tx.Memos = [{
        Memo: {
          MemoType: convertStringToHex(memo.type),
          MemoData: convertStringToHex(memo.data),
        }
      }];
    }
    
    return tx;
  }, []);

  // Return the hook interface with network information
  return {
    client,
    isConnected,
    isConnecting,
    error,
    getAccountInfo,
    submitTransaction,
    getTransactionStatus,
    createPaymentTransaction,
    network: currentNetwork
  };
} 