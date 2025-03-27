
import { useCallback } from 'react'
import { useClientChainGateway } from './useClientChainGateway'
import { parseEther } from 'viem'
import { useContractUtils } from './useContractUtils'

export type TxStatus = 'approving' | 'processing' | 'success' | 'error'

interface TxHandlerOptions {
  onStatus?: (status: TxStatus, error?: string) => void
}

export function useNSTOperations() {
  const { contract, publicClient } = useClientChainGateway()
  const { handleTxWithStatus, getQuote } = useContractUtils()

  const handleCreateCapsule = useCallback(async (
    options?: TxHandlerOptions
  ) => {
    if (!contract) throw new Error('Contract not found')
    
    return handleTxWithStatus(
      contract.write.createImuaCapsule(),
      options
    )
  }, [contract, handleTxWithStatus])

  const handleStakeToBeacon = useCallback(async (
    pubkey: `0x${string}`,
    signature: `0x${string}`,
    depositDataRoot: `0x${string}`,
    options?: TxHandlerOptions
  ) => {
    if (!contract) throw new Error('Contract not found')
    
    return handleTxWithStatus(
      contract.write.stake(
        [pubkey, signature, depositDataRoot],
        { value: parseEther('32') }
      ),
      options
    )
  }, [contract, handleTxWithStatus])

  const handleVerifyAndDepositNativeStake = useCallback(async (
    validatorContainer: `0x${string}`[],
    proof: any,
    options?: TxHandlerOptions
  ) => {
    if (!contract) throw new Error('Contract not found')
    const fee = await getQuote('asset')
    
    return handleTxWithStatus(
      contract.write.verifyAndDepositNativeStake(
        [validatorContainer, proof],
        { value: fee }
      ),
      options
    )
  }, [contract, handleTxWithStatus, getQuote])

  const handleProcessBeaconWithdrawal = useCallback(async (
    validatorContainer: `0x${string}`[],
    validatorProof: any,
    withdrawalContainer: `0x${string}`[],
    withdrawalProof: any,
    options?: TxHandlerOptions
  ) => {
    if (!contract) throw new Error('Contract not found')
    const fee = await getQuote('asset')
    
    return handleTxWithStatus(
      contract.write.processBeaconChainWithdrawal(
        [validatorContainer, validatorProof, withdrawalContainer, withdrawalProof],
        { value: fee }
      ),
      options
    )
  }, [contract, handleTxWithStatus])

  const handleWithdrawNonBeaconETH = useCallback(async (
    recipient: `0x${string}`,
    amount: bigint,
    options?: TxHandlerOptions
  ) => {
    if (!contract) throw new Error('Contract not found')
    
    return handleTxWithStatus(
      contract.write.withdrawNonBeaconChainETHFromCapsule([recipient, amount]),
      options
    )
  }, [contract, handleTxWithStatus])

  return {
    createCapsule: handleCreateCapsule,
    stakeToBeacon: handleStakeToBeacon,
    verifyAndDepositNativeStake: handleVerifyAndDepositNativeStake,
    processBeaconWithdrawal: handleProcessBeaconWithdrawal,
    withdrawNonBeaconETH: handleWithdrawNonBeaconETH
  }
} 