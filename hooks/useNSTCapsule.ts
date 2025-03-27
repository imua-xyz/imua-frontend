import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useClientChainGateway } from './useClientChainGateway'
import { Address } from 'viem'

export interface CapsuleInfo {
  address: Address | null
  isLoading: boolean
  error: Error | null
}

export type CapsuleStatus = 'processing' | 'success' | 'error'

export function useNSTCapsule() {
  const { address: userAddress } = useAccount()
  const { contract } = useClientChainGateway()
  const [capsuleInfo, setCapsuleInfo] = useState<CapsuleInfo>({
    address: null,
    isLoading: true,
    error: null
  })
  const [createStatus, setCreateStatus] = useState<CapsuleStatus | null>(null)

  // Fetch capsule address
  useEffect(() => {
    async function fetchCapsule() {
      if (!userAddress || !contract) {
        setCapsuleInfo(prev => ({ ...prev, isLoading: false }))
        return
      }

      try {
        const capsuleAddress = await contract.read.ownerToCapsule([userAddress])
        setCapsuleInfo({
          address: capsuleAddress as Address,
          isLoading: false,
          error: null
        })
      } catch (error) {
        setCapsuleInfo({
          address: null,
          isLoading: false,
          error: error as Error
        })
      }
    }

    fetchCapsule()
  }, [userAddress, contract])

  // Memoized create function
  const createCapsule = useCallback(async () => {
    if (!contract) {
      throw new Error('Gateway not initialized')
    }

    try {
      setCreateStatus('processing')
      const tx = await contract.write.createImuaCapsule()
      
      // Fetch new capsule address
      const newCapsuleAddress = await contract.read.ownerToCapsule([userAddress as Address])
      setCapsuleInfo(prev => ({
        ...prev,
        address: newCapsuleAddress as Address,
        error: null
      }))
      
      setCreateStatus('success')
      return newCapsuleAddress
    } catch (error) {
      setCreateStatus('error')
      setCapsuleInfo(prev => ({
        ...prev,
        error: error as Error
      }))
      throw error
    }
  }, [contract, userAddress])

  // Reset status after delay
  useEffect(() => {
    if (createStatus === 'success' || createStatus === 'error') {
      const timer = setTimeout(() => {
        setCreateStatus(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [createStatus])

  return {
    capsuleAddress: capsuleInfo.address,
    isLoading: capsuleInfo.isLoading,
    error: capsuleInfo.error,
    createStatus,
    createCapsule
  }
} 