import { useReadContract, useChainId } from 'wagmi'
import { useAccount } from 'wagmi'
import { exocore, CHAIN_ID_TO_ENDPOINT } from '@/config/wagmi'
import { encodePacked } from 'viem'
import IAssetsABI from '@/IAssets.abi.json'

const ASSETS_PRECOMPILE_ADDRESS = '0x0000000000000000000000000000000000000804'

interface StakerBalance {
  clientChainID: number
  stakerAddress: `0x${string}`
  tokenID: `0x${string}`
  balance: bigint
  withdrawable: bigint
  delegated: bigint
  pendingUndelegated: bigint
  totalDeposited: bigint
}

export function useIAssets(tokenAddress: `0x${string}`) {
  const { address: userAddress } = useAccount()
  const clientChainId = useChainId()
  const endpointId = CHAIN_ID_TO_ENDPOINT[clientChainId as keyof typeof CHAIN_ID_TO_ENDPOINT]

  const { data: balanceData } = useReadContract({
    address: ASSETS_PRECOMPILE_ADDRESS,
    abi: IAssetsABI,
    functionName: 'getStakerBalanceByToken',
    args: [
      endpointId,
      encodePacked(['address'], [userAddress!]),
      encodePacked(['address'], [tokenAddress])
    ],
    chainId: exocore.id,
    query: {
      enabled: Boolean(userAddress && tokenAddress && endpointId),
    },
  }) as { data: [boolean, StakerBalance] | undefined }

  console.log('Debug StakerBalance:', {
    success: balanceData?.[0],
    balance: balanceData?.[1],
    args: {
      endpointId,
      userAddress,
      tokenAddress
    }
  })

  return {
    success: balanceData?.[0],
    stakerBalance: balanceData?.[1] as StakerBalance | undefined,
  }
}