import { useCallback } from 'react'
import { useClientChainGateway } from './useClientChainGateway'
import { useXrplClient } from './useXrplClient'
import { TxHandlerOptions, TxStatus } from '@/types/staking'

export function useTxUtils() {
  const { contract, publicClient } = useClientChainGateway()
  const xrplClient = useXrplClient()

  const handleEVMTxWithStatus = useCallback(async (
    txPromise: Promise<`0x${string}`>,
    options?: TxHandlerOptions,
    status: TxStatus = 'processing'
  ) => {
    if (!publicClient) throw new Error('Public client not found')
    try {
      options?.onStatus?.(status)
      const hash = await txPromise
      
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        timeout: 30_000
      })
      
      if (receipt.status === 'success') {
        options?.onStatus?.('success')
        return hash
      } else {
        options?.onStatus?.('error', 'Transaction failed')
        throw new Error('Transaction failed')
      }
    } catch (error) {
      options?.onStatus?.('error', error instanceof Error ? error.message : 'Transaction failed')
      throw error
    }
  }, [publicClient])

  const handleXrplTxWithStatus = useCallback(async (
    txPromise: Promise<any>,
    options?: TxHandlerOptions
  ) => {
    options?.onStatus?.('processing');
    
    try {
      const result = await txPromise;
      
      if (!result.success || !result.data?.hash) {
        options?.onStatus?.('error', result.error || 'Transaction failed');
        throw new Error(result.error || 'Transaction failed');
      }
      
      // Wait for transaction to be confirmed
      const confirmation = await xrplClient.getTransactionStatus(result.data.hash);
      
      if (!confirmation.success) {
        const errorMsg = confirmation.error || 'Failed to confirm transaction';
        options?.onStatus?.('error', errorMsg);
        throw new Error(errorMsg);
      }
      
      options?.onStatus?.('success');
      return result.data.hash;
    } catch (error) {
      options?.onStatus?.('error', error instanceof Error ? error.message : 'Transaction failed');
      throw error;
    }
  }, [xrplClient]);

  return {
    handleEVMTxWithStatus,
    handleXrplTxWithStatus
  }
} 