import { useReadContract } from 'wagmi'
import { useAccount, useChainId } from 'wagmi'
import VaultABI from '@/abi/Vault.abi.json'

export function useVault(vaultAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount()
  const chainId = useChainId()

  const { data: withdrawableAmount } = useReadContract({
    address: vaultAddress,
    abi: VaultABI,
    functionName: 'getWithdrawableBalance',
    args: [userAddress!],
    chainId,
    query: {
      enabled: Boolean(vaultAddress && userAddress),
    }
  }) as { data: bigint | undefined }

  const { data: tvlLimit } = useReadContract({
    address: vaultAddress,
    abi: VaultABI,
    functionName: 'getTvlLimit',
    chainId,
    query: {
      enabled: Boolean(vaultAddress),
    }
  })

  const { data: consumedTvl } = useReadContract({
    address: vaultAddress,
    abi: VaultABI,
    functionName: 'getConsumedTvl',
    chainId,
    query: {
      enabled: Boolean(vaultAddress),
    }
  })

  return {
    withdrawableAmount,
    tvlLimit,
    consumedTvl
  }
} 