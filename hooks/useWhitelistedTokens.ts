"use client"

import { useReadContract, useReadContracts, useAccount } from 'wagmi'
import { TokenInfo } from '@/types/staking'
import { getPortalContractByEvmChainID } from '@/config/stakingPortals'
import { erc20Abi } from 'viem'
const VIRTUAL_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as `0x${string}` 

export function useWhitelistedTokens() {
  const {isConnected, chainId} = useAccount()
  const portalContract = getPortalContractByEvmChainID(chainId as number)

  const contractAddress = portalContract && portalContract.name === 'ClientChainGateway' ? portalContract.address : null
  const contractAbi = portalContract && portalContract.name === 'ClientChainGateway' ? portalContract.abi : null

  // Get token count
  const { data: countData, isLoading: countLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: contractAbi,
    functionName: 'getWhitelistedTokensCount',
  })

  // Get all token addresses
  const { data: tokenAddresses, isLoading: addressesLoading } = useReadContracts({
    contracts: countData ? Array.from({ length: Number(countData) }, (_, i) => ({
      address: contractAddress as `0x${string}`,
      abi: contractAbi,
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

  return { isConnected, tokens, isLoading: false }
} 