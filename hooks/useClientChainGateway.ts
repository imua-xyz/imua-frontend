"use client"

import { useAccount, useWriteContract, useChainId, useReadContract } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { CONTRACTS } from '@/config/contracts'
import { parseEther, maxUint256, erc20Abi } from 'viem'
import { config, CHAIN_ID_TO_NAME, publicClients } from '@/config/wagmi'

export type TxStatus = 'approving' | 'processing' | 'success' | 'error'

interface TxHandlerOptions {
  onStatus?: (status: TxStatus, error?: string) => void
}

export function useClientChainGateway(token: `0x${string}`) {
  const { address: userAddress } = useAccount()
  const chainId = useChainId()
  const { writeContract } = useWriteContract()
  const publicClient = publicClients[chainId as keyof typeof publicClients]
  const contractAddress = chainId ? CONTRACTS.CLIENT_CHAIN_GATEWAY.address[CHAIN_ID_TO_NAME[chainId as keyof typeof CHAIN_ID_TO_NAME]] : undefined

  // Get vault address first
  const { data: vaultAddress } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi,
    functionName: 'tokenToVault',
    args: [token],
    query: {
      enabled: Boolean(contractAddress && token),
      gcTime: Infinity, // Keep in cache indefinitely
      staleTime: Infinity // Never mark as stale
    }
  })

  // Then check allowance against vault
  const { data: allowance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [userAddress!, vaultAddress as `0x${string}`],
    query: {
      enabled: Boolean(userAddress && vaultAddress && token)
    }
  })

  // Read withdrawable balance from ClientChainGateway
  const { data: withdrawableAmount } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi,
    functionName: 'withdrawableAmounts',
    args: userAddress && token ? [userAddress, token] : undefined,
    query: {
      enabled: !!userAddress && !!contractAddress && !!token,
    }
  })

  // Message length constants from ActionAttributes.sol
  const MESSAGE_LENGTHS = {
    ASSET_OPERATION: 97,      // For deposit, withdraw, claim/submit reward
    DELEGATION_OPERATION: 139, // For delegate, undelegate, depositThenDelegate
    ASSOCIATE_OPERATOR: 75,    // For associate operator
    DISSOCIATE_OPERATOR: 33    // For dissociate operator
  }

  const getQuote = async (operation: 'asset' | 'delegation' | 'associate' | 'dissociate') => {
    if (!contractAddress) return BigInt(0)

    // Create zero-padded message with correct length
    const length = {
      'asset': MESSAGE_LENGTHS.ASSET_OPERATION,
      'delegation': MESSAGE_LENGTHS.DELEGATION_OPERATION,
      'associate': MESSAGE_LENGTHS.ASSOCIATE_OPERATOR,
      'dissociate': MESSAGE_LENGTHS.DISSOCIATE_OPERATOR
    }[operation]

    const message = '0x' + '00'.repeat(length)
    
    const fee = await readContract(config, {
      address: contractAddress as `0x${string}`,
      abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi,
      functionName: 'quote',
      args: [message]
    })

    return fee
  }

  const handleTxWithStatus = async (
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
  }

  const handleDeposit = async (
    token: `0x${string}`, 
    amount: string,
    options?: TxHandlerOptions
  ): Promise<`0x${string}`> => {
    if (!amount || !contractAddress) throw new Error('Invalid parameters')
    const fee = await getQuote('asset')
    
    return handleTxWithStatus(
      new Promise((resolve, reject) => {
        writeContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi,
          functionName: 'deposit',
          args: [token, parseEther(amount)],
          value: fee as bigint,
        }, {
          onSuccess: (hash) => resolve(hash),
          onError: (error) => reject(error)
        })
      }),
      options
    )
  }

  const handleDelegateTo = async (
    operator: string, 
    token: `0x${string}`, 
    amount: string,
    options?: TxHandlerOptions
  ) => {
    if (!amount || !operator || !contractAddress) throw new Error('Invalid parameters')
    const fee = await getQuote('delegation')
    
    return handleTxWithStatus(
      new Promise((resolve, reject) => {
        writeContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi,
          functionName: 'delegateTo',
          args: [operator, token, parseEther(amount)],
          value: fee as bigint
        }, {
          onSuccess: (hash) => resolve(hash),
          onError: (error) => reject(error)
        })
      }),
      options
    )
  }

  const handleUndelegateFrom = async (
    operator: string, 
    token: `0x${string}`, 
    amount: string,
    options?: TxHandlerOptions
  ) => {
    if (!amount || !operator || !contractAddress) throw new Error('Invalid parameters')
    const fee = await getQuote('delegation')
    
    return handleTxWithStatus(
      new Promise((resolve, reject) => {
        writeContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi,
          functionName: 'undelegateFrom',
          args: [operator, token, parseEther(amount)],
          value: fee as bigint
        }, {
          onSuccess: (hash) => resolve(hash),
          onError: (error) => reject(error)
        })
      }),
      options
    )
  }

  const handleDepositAndDelegate = async (
    token: `0x${string}`, 
    amount: string, 
    operator: string,
    options?: TxHandlerOptions
  ) => {
    if (!amount || !operator || !contractAddress) throw new Error('Invalid parameters')
    const fee = await getQuote('delegation')
    
    return handleTxWithStatus(
      new Promise((resolve, reject) => {
        writeContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi,
          functionName: 'depositThenDelegateTo',
          args: [token, parseEther(amount), operator],
          value: fee as bigint,
        }, {
          onSuccess: (hash) => resolve(hash),
          onError: (error) => reject(error)
        })
      }),
      options
    )
  }

  const handleClaimPrincipal = async (
    token: `0x${string}`, 
    amount: string,
    options?: TxHandlerOptions
  ) => {
    if (!amount || !contractAddress) throw new Error('Invalid parameters')
    const fee = await getQuote('asset')
    
    return handleTxWithStatus(
      new Promise((resolve, reject) => {
        writeContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi,
          functionName: 'claimPrincipalFromExocore',
          args: [token, parseEther(amount)],
          value: fee as bigint
        }, {
          onSuccess: (hash) => resolve(hash),
          onError: (error) => reject(error)
        })
      }),
      options
    )
  }

  const handleWithdrawPrincipal = async (
    token: `0x${string}`, 
    amount: string, 
    recipient: `0x${string}`,
    options?: TxHandlerOptions
  ) => {
    if (!amount || !recipient || !contractAddress) throw new Error('Invalid parameters')
    
    return handleTxWithStatus(
      new Promise((resolve, reject) => {
        writeContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi,
          functionName: 'withdrawPrincipal',
          args: [token, parseEther(amount), recipient]
        }, {
          onSuccess: (hash) => resolve(hash),
          onError: (error) => reject(error)
        })
      }),
      options
    )
  }

  const handleStakeWithApproval = async (
    token: `0x${string}`, 
    amount: string,
    operatorAddress?: string,
    onStatus?: (status: TxStatus, error?: string) => void
  ): Promise<`0x${string}`> => {
    if (!amount || !contractAddress || !userAddress || !publicClient) throw new Error('Invalid parameters')

    try {
      // First check and handle approval if needed
      if (!allowance || allowance < parseEther(amount)) {
        onStatus?.('approving')
        const hash = await writeContract({
          address: token,
          abi: erc20Abi,
          functionName: 'approve',
          args: [vaultAddress as `0x${string}`, maxUint256]
        }) as unknown as `0x${string}`
        
        try {
          await publicClient.waitForTransactionReceipt({ 
            hash,
            timeout: 30_000 // 30 seconds timeout
          })
          // Wait a second after successful receipt to allow state updates
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          console.warn('Error waiting for approval receipt:', error)
          onStatus?.('error', 'Failed to confirm approval. Please try again.')
          throw new Error('Approval failed')
        }
      }

      // Proceed with stake/deposit
      onStatus?.('processing')
      const depositHash: `0x${string}` | undefined = (operatorAddress 
        ? await handleDepositAndDelegate(token, amount, operatorAddress)
        : await handleDeposit(token, amount))

      if (!depositHash) {
        throw new Error('No transaction hash received')
      }

      try {
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: depositHash,
          timeout: 30_000 
        })
        
        if (receipt.status === 'success') {
          onStatus?.('success')
        } else {
          onStatus?.('error', 'Transaction failed')
          throw new Error('Transaction failed')
        }
      } catch (error) {
        console.error('Error waiting for deposit receipt:', error)
        onStatus?.('error', 'Failed to confirm transaction')
        throw error
      }

      return depositHash
    } catch (error) {
      onStatus?.('error', error instanceof Error ? error.message : 'Transaction failed')
      throw error
    }
  }

  return {
    allowance,
    vaultAddress,
    withdrawableAmount,
    // LST Operations
    handleDeposit,
    handleDelegateTo,
    handleUndelegateFrom,
    handleDepositAndDelegate,
    handleClaimPrincipal,
    handleWithdrawPrincipal,
    handleStakeWithApproval,
    getQuote,
  }
} 