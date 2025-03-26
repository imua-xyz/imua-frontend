import { useCallback } from 'react'
import { useClientChainGateway } from './useClientChainGateway'

export type TxStatus = 'approving' | 'processing' | 'success' | 'error'

export interface TxHandlerOptions {
  onStatus?: (status: TxStatus, error?: string) => void
}

export type OperationType = 'asset' | 'delegation' | 'associate' | 'dissociate'

export function useContractUtils() {
  const { contract, publicClient } = useClientChainGateway()

  const handleTxWithStatus = useCallback(async (
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

  const getQuote = useCallback(async (operation: OperationType) => {
    if (!contract) return BigInt(0)

    const lengths = {
      'asset': 97,
      'delegation': 139,
      'associate': 75,
      'dissociate': 33
    }

    const message = '0x' + '00'.repeat(lengths[operation])
    return contract.read.quote([message])
  }, [contract])

  return {
    handleTxWithStatus,
    getQuote
  }
} 