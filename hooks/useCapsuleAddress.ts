import { useClientChainGateway } from './useClientChainGateway'
import { useReadContract } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'

export function useCapsuleAddress() {
  const { contractAddress, userAddress } = useClientChainGateway()

  const { data: capsuleAddress } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi,
    functionName: 'ownerToCapsule',
    args: [userAddress],
    query: {
      enabled: Boolean(contractAddress && userAddress),
      gcTime: Infinity,
      staleTime: Infinity
    }
  })

  return capsuleAddress
} 