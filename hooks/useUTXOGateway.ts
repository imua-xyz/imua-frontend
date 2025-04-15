'use client';

import { useAccount, useChainId, useWalletClient, usePublicClient } from 'wagmi';
import { getContract } from 'viem';
import { CONTRACTS } from '@/config/contracts';

/**
 * Hook for interacting with the UTXOGateway contract
 */
export function useUTXOGateway() {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  // Get contract address for current chain
  const contractAddress = CONTRACTS.UTXOGateway.address["imuachain_testnet"] as `0x${string}`
  
  // Create contract instance if we have the necessary dependencies
  const contract = contractAddress && walletClient && publicClient
    ? getContract({
        address: contractAddress,
        abi: CONTRACTS.UTXOGateway.abi,
        client: { public: publicClient, wallet: walletClient },
      })
    : null;
  
  // Check if contract is available on the current chain
  const isContractAvailable = !!contractAddress;
  
  // Check if the user is connected to a supported chain
  const isChainSupported = isContractAvailable;
  
  return {
    contract,
    publicClient,
    walletClient,
    contractAddress,
    userAddress,
    chainId,
    isContractAvailable,
    isChainSupported
  };
} 