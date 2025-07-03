import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBalance } from "wagmi";
import { maxUint256, getContract, erc20Abi } from "viem";
import { WalletConnector } from "@/types/wallet-connector";
import { StakingService } from "@/types/staking-service";
import { useAssetsPrecompile } from "./useAssetsPrecompile";
import { useVault } from "./useVault";
import { getMetadataByEvmChainID } from "@/config/stakingPortals";
import { EVMLSTToken } from "@/types/tokens";
import { usePortalContract } from "./usePortalContract";
import { useAccount } from "wagmi";
import { OperationType } from "@/types/staking";
import { handleEVMTxWithStatus } from "@/lib/txUtils";
import { EVMWalletConnector } from "@/types/wallet-connector";

export function useEVMWalletConnector(token: EVMLSTToken): EVMWalletConnector {
  const { address: userAddress, chainId, isConnected } = useAccount();
  const { data: balance } = useBalance({ address: userAddress });

  const isReady = isConnected && chainId === token.network.evmChainID;
  const issues = isReady
    ? undefined
    : {
        needsConnectToNative: true,
      };

  const nativeCurrencyBalance = {
    value: balance?.value || BigInt(0),
    decimals: balance?.decimals || 0,
    symbol: balance?.symbol || "",
  };

  return {
    isReady: isReady,
    isNativeWalletConnected: isConnected,
    nativeWalletAddress: userAddress as `0x${string}`,
    nativeCurrencyBalance: nativeCurrencyBalance,
    issues: issues,
  };
}
