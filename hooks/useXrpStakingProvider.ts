'use client';

import { useState, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { encodePacked } from 'viem';
import { XRP_VAULT_ADDRESS } from '@/config/xrp';
import { useUTXOGateway } from './useUTXOGateway';
import { useXrplClient } from './useXrplClient';
import { useAssetsPrecompile } from './useAssetsPrecompile';
import { useGemWallet } from './useGemWallet';
import { useTxUtils } from './useTxUtils';
import { TxHandlerOptions, StakerBalance, StakingProvider } from '@/types/staking';
import { XRP_CHAIN_ID, XRP_TOKEN_ENUM, XRP_TOKEN_ADDRESS } from '@/config/xrp';

// Helper function to generate a random destination tag
const generateDestinationTag = (): number => {
  return Math.floor(10000000 + Math.random() * 90000000);
};

export function useXrpStakingProvider(): StakingProvider {
  const { address: evmAddress } = useAccount();
  const { isConnected: isGemWalletConnected, userAddress: xrpAddress, sendTransaction } = useGemWallet();
  
  const xrplClient = useXrplClient();

  const { contract, isContractAvailable } = useUTXOGateway();
  const { getStakerBalanceByToken } = useAssetsPrecompile();
  const { handleEVMTxWithStatus, handleXrplTxWithStatus } = useTxUtils();
  
  // Fetch staking position
  const getStakerXrpBalance = useCallback(async () : Promise<{ success: boolean, stakerBalance?: StakerBalance }> => {
    if (!xrpAddress || !isContractAvailable) return { success: false };
    
    try {
      // First get binded evm address for the xrp address
      const bindedEvmAddress = await contract?.read.getImuachainAddress([XRP_CHAIN_ID, xrpAddress]);
      if (!bindedEvmAddress) return { success: false };
      
      // Get staker balance from Assets Precompile
      const { success, stakerBalance } = await getStakerBalanceByToken(
        XRP_CHAIN_ID,
        bindedEvmAddress as `0x${string}`,
        XRP_TOKEN_ADDRESS
      );
      
      return success && stakerBalance ? { success: true, stakerBalance } : { success: false };
    } catch (error) {
      console.error('Error fetching staking position:', error);
      return { success: false };
    }
  }, [xrpAddress, contract, getStakerBalanceByToken, isContractAvailable]);

  // Stake XRP
  const stakeXrp = useCallback(async (
    amount: bigint,
    vaultAddress: `0x${string}`,
    operatorAddress?: string,
    options?: TxHandlerOptions
  ) => {
    if (!isGemWalletConnected || !xrpAddress) throw new Error('Gem wallet not connected');
    if (!vaultAddress || !amount) throw new Error('Invalid parameters');
    if (operatorAddress) throw new Error('Operator address not supported for now');
    
    // Get account info using the xrplClient
    const accountInfo = await xrplClient.getAccountInfo(xrpAddress);
    if (!accountInfo.success) throw new Error('Failed to fetch account info');
    
    const destinationTag = generateDestinationTag();
    const memoData = evmAddress ? encodePacked(['address'], [evmAddress]).slice(2) : "";
    
    const txPayload = {
      TransactionType: 'Payment',
      Account: xrpAddress,
      Destination: vaultAddress,
      Amount: String(amount),
      DestinationTag: destinationTag,
      Memos: [{
        Memo: {
          MemoType: "0x6576", // "ev" for Ethereum/EVM in hex
          MemoData: memoData,
          MemoFormat: "text/plain"
        }
      }]
    };
    
    return handleXrplTxWithStatus(
      sendTransaction(txPayload),
      options
    );
  }, [isGemWalletConnected, xrpAddress, evmAddress, xrplClient, handleXrplTxWithStatus, sendTransaction]);
  
  // Get relaying fee
  const getQuote = useCallback(async (): Promise<bigint> => {
    return BigInt(0); // 12 drops in XRP
  }, []);
  
  // Delegate XRP to an operator
  const delegateXrp = useCallback(async (
    operator: string,
    amount: bigint,
    options?: TxHandlerOptions
  ) => {
    if (!contract) throw new Error('Contract not available');
    if (!operator || !amount) throw new Error('Invalid parameters');
    
    return handleEVMTxWithStatus(
      contract.write.delegateTo([XRP_TOKEN_ENUM, operator, amount]),
      options
    );
  }, [contract, handleEVMTxWithStatus]);
  
  // Undelegate XRP from an operator
  const undelegateXrp = useCallback(async (
    operator: string,
    amount: bigint,
    options?: TxHandlerOptions
  ) => {
    if (!contract) throw new Error('Contract not available');
    if (!operator || !amount) throw new Error('Invalid parameters');
    
    return handleEVMTxWithStatus(
      contract.write.undelegateFrom([XRP_TOKEN_ENUM, operator, amount]),
      options
    );
  }, [contract, handleEVMTxWithStatus]);
  
  // Withdraw XRP from staking
  const withdrawXrp = useCallback(async (
    amount: bigint,
    recipient?: `0x${string}`,
    options?: TxHandlerOptions
  ) => {
    if (!contract) throw new Error('Contract not available');
    if (!amount) throw new Error('Invalid parameters');
    if (recipient) throw new Error('Recipient not supported for now');
    
    return handleEVMTxWithStatus(
      contract.write.withdrawPrincipal([XRP_TOKEN_ENUM, amount]),
      options
    );
  }, [contract, handleEVMTxWithStatus]);
  
  return {
    stake: stakeXrp,
    delegateTo: delegateXrp,
    undelegateFrom: undelegateXrp,
    withdrawPrincipal: withdrawXrp,
    getQuote
  };
}