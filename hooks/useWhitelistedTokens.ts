"use client"

import { useReadContract, useReadContracts, useChainId } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'
import { erc20Abi, Abi } from 'viem'
import { CHAIN_ID_TO_NAME } from '@/config/wagmi'
import { VIRTUAL_TOKEN } from '@/config/constants'

interface TokenInfo {
  address: `0x${string}`
  name: string
  symbol: string
  decimals: number
}

export function useWhitelistedTokens() {
  const chainId = useChainId()
  const contractAddress = chainId ? CONTRACTS.CLIENT_CHAIN_GATEWAY.address[CHAIN_ID_TO_NAME[chainId as keyof typeof CHAIN_ID_TO_NAME]] : undefined

  // Get token count
  const { data: countData, isLoading: countLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi,
    functionName: 'getWhitelistedTokensCount',
  })

  // Get all token addresses
  const { data: tokenAddresses, isLoading: addressesLoading } = useReadContracts({
    contracts: countData ? Array.from({ length: Number(countData) }, (_, i) => ({
      address: contractAddress as `0x${string}`,
      abi: CONTRACTS.CLIENT_CHAIN_GATEWAY.abi as Abi,
      functionName: 'whitelistTokens',
      args: [BigInt(i)]
    })) : []
  })

  // Get ERC20 details for non-virtual tokens
  const { data: tokenDetails, isLoading: detailsLoading } = useReadContracts({
    contracts: tokenAddresses ? (tokenAddresses as any[]).flatMap(response => {
      const addr = (response as any).result
      return addr.toLowerCase() !== VIRTUAL_TOKEN.toLowerCase() ? [
        {
          address: addr as `0x${string}`,
          abi: erc20Abi,
          functionName: 'name'
        },
        {
          address: addr as `0x${string}`,
          abi: erc20Abi,
          functionName: 'symbol'
        },
        {
          address: addr as `0x${string}`,
          abi: erc20Abi,
          functionName: 'decimals'
        }
      ] : []
    }) : []
  })

  if (countLoading || addressesLoading || detailsLoading) {
    return { tokens: undefined, isLoading: true }
  }

  if (!tokenAddresses) {
    return { tokens: undefined, isLoading: false }
  }

  // Map addresses to token info
  const tokens: TokenInfo[] = (tokenAddresses as any[]).map((response, i) => {
    const address = (response as any).result
    if (address.toLowerCase() === VIRTUAL_TOKEN.toLowerCase()) {
      return {
        address: address as `0x${string}`,
        name: 'Native Token',
        symbol: 'ETH',
        decimals: 18
      }
    } else {
      const detailsIndex = (tokenAddresses as any[])
        .slice(0, i)
        .filter(res => (res as any).result.toLowerCase() !== VIRTUAL_TOKEN.toLowerCase())
        .length * 3
      
      return {
        address: address as `0x${string}`,
        name: (tokenDetails as any[])[detailsIndex].result,
        symbol: (tokenDetails as any[])[detailsIndex + 1].result,
        decimals: (tokenDetails as any[])[detailsIndex + 2].result
      }
    }
  })

  console.log('DEBUG: All tokens:', tokens)
  return { tokens, isLoading: false }
} 