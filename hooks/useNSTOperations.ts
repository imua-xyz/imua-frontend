
import { useCallback } from 'react'
import { useClientChainGateway } from './useClientChainGateway'
import { parseEther } from 'viem'
import { useTxUtils } from './useTxUtils'
import { TxHandlerOptions } from '@/types/staking'

export function useNSTOperations() {
  const { contract, publicClient, getQuote } = useClientChainGateway()
  const { handleEVMTxWithStatus } = useTxUtils()

  const handleCreateCapsule = useCallback(async (
    options?: TxHandlerOptions
  ) => {
    if (!contract) throw new Error('Contract not found')
    
    return handleEVMTxWithStatus(
      contract.write.createImuaCapsule(),
      options
    )
  }, [contract, handleEVMTxWithStatus])

  const handleStakeToBeacon = useCallback(async (
    pubkey: `0x${string}`,
    signature: `0x${string}`,
    depositDataRoot: `0x${string}`,
    options?: TxHandlerOptions
  ) => {
    if (!contract) throw new Error('Contract not found')
    
    return handleEVMTxWithStatus(
      contract.write.stake(
        [pubkey, signature, depositDataRoot],
        { value: parseEther('32') }
      ),
      options
    )
  }, [contract, handleEVMTxWithStatus])

  const handleVerifyAndDepositNativeStake = useCallback(async (
    validatorContainer: `0x${string}`[],
    proof: any,
    options?: TxHandlerOptions
  ) => {
    if (!contract) throw new Error('Contract not found')
    const fee = await getQuote('asset')
    
    return handleEVMTxWithStatus(
      contract.write.verifyAndDepositNativeStake(
        [validatorContainer, proof],
        { value: fee }
      ),
      options
    )
  }, [contract, handleEVMTxWithStatus, getQuote])

  const handleProcessBeaconWithdrawal = useCallback(async (
    validatorContainer: `0x${string}`[],
    validatorProof: any,
    withdrawalContainer: `0x${string}`[],
    withdrawalProof: any,
    options?: TxHandlerOptions
  ) => {
    if (!contract) throw new Error('Contract not found')
    const fee = await getQuote('asset')
    
    return handleEVMTxWithStatus(
      contract.write.processBeaconChainWithdrawal(
        [validatorContainer, validatorProof, withdrawalContainer, withdrawalProof],
        { value: fee }
      ),
      options
    )
  }, [contract, handleEVMTxWithStatus])

  const handleWithdrawNonBeaconETH = useCallback(async (
    recipient: `0x${string}`,
    amount: bigint,
    options?: TxHandlerOptions
  ) => {
    if (!contract) throw new Error('Contract not found')
    
    return handleEVMTxWithStatus(
      contract.write.withdrawNonBeaconChainETHFromCapsule([recipient, amount]),
      options
    )
  }, [contract, handleEVMTxWithStatus])

  return {
    createCapsule: handleCreateCapsule,
    stakeToBeacon: handleStakeToBeacon,
    verifyAndDepositNativeStake: handleVerifyAndDepositNativeStake,
    processBeaconWithdrawal: handleProcessBeaconWithdrawal,
    withdrawNonBeaconETH: handleWithdrawNonBeaconETH
  }
} 