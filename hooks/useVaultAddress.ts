import { useClientChainGateway } from './useClientChainGateway'
import { useReadContract } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'

export function useVaultAddress(token: `0x${string}`) {
  const { contractAddress } = useClientChainGateway()

  const { data: vaultAddress } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi,
    functionName: 'tokenToVault',
    args: [token],
    query: {
      enabled: Boolean(contractAddress && token),
      gcTime: Infinity,
      staleTime: Infinity
    }
  })

  return vaultAddress
} 