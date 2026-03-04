"use client";

import { useMemo } from "react";
import { useBootstrapStatus } from "./useBootstrapStatus";
import {
  useBootstrapAddressBinding,
  useBootstrapAddressBindingsByTarget,
} from "./useBootstrapGraphQL";
import { useUTXOGateway } from "./useUTXOGateway";
import { useAllWalletsStore } from "@/stores/allWalletsStore";
import { xrpl } from "@/types/networks";
import { useQuery } from "@tanstack/react-query";
import { Token } from "@/types/tokens";

/**
 * Unified hook to fetch address binding for any chain type
 * Automatically switches between GraphQL (bootstrap) and contract (post-bootstrap)
 * with provisional binding support and reconciliation
 */
export function useAddressBinding(
  chainType: "XRP" | "BTC",
  sourceAddress: string,
  customChainId: number,
) {
  const { bootstrapStatus } = useBootstrapStatus();
  const isBootstrapPhase = !bootstrapStatus?.isBootstrapped;

  // Get provisional binding from store
  const provisionalBindingKey = `${customChainId}-${sourceAddress.toLowerCase()}`;
  const provisionalBinding = useAllWalletsStore(
    (state) => state.provisionalBindings[provisionalBindingKey],
  );

  // GraphQL binding (bootstrap phase only)
  const graphqlBinding = useBootstrapAddressBinding(
    chainType,
    sourceAddress || "",
  );

  // Contract binding (post-bootstrap phase only)
  const { readonlyContract: utxoGateway } = useUTXOGateway(xrpl);

  // Query contract binding for post-bootstrap phase
  const contractBinding = useQuery({
    queryKey: ["contract-binding", chainType, sourceAddress, customChainId],
    queryFn: async () => {
      if (!utxoGateway || !sourceAddress) {
        return null;
      }

      try {
        // Convert address to bytes format
        const addressBytes =
          "0x" + Buffer.from(sourceAddress, "utf8").toString("hex");

        // Call the contract to get bound address
        const boundAddress = await utxoGateway.read.getImuachainAddress([
          customChainId,
          addressBytes,
        ]);

        // Check if the returned address is not the zero address
        const isValidAddress =
          boundAddress &&
          boundAddress !== "0x0000000000000000000000000000000000000000";

        return isValidAddress ? (boundAddress as `0x${string}`) : null;
      } catch (error) {
        console.error("Error fetching contract binding:", error);
        return null;
      }
    },
    enabled: !isBootstrapPhase && !!sourceAddress && !!utxoGateway,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Unified return value
  const binding = useMemo(() => {
    // Priority 1: Use network data (source of truth)
    if (isBootstrapPhase) {
      // Bootstrap phase: use GraphQL
      const networkData = graphqlBinding.data?.target_addr || null;
      if (networkData) {
        return {
          data: networkData,
          loading: graphqlBinding.loading,
          error: graphqlBinding.error,
          refetch: graphqlBinding.refetch,
          source: "graphql" as const,
        };
      }
    } else {
      // Post-bootstrap phase: use contract
      const networkData = contractBinding.data || null;
      if (networkData) {
        return {
          data: networkData,
          loading: contractBinding.isLoading,
          error: contractBinding.error,
          refetch: contractBinding.refetch,
          source: "contract" as const,
        };
      }
    }

    // Priority 2: Use provisional binding (fallback during confirmation delay)
    if (provisionalBinding) {
      return {
        data: provisionalBinding.targetAddress,
        loading: false,
        error: null,
        refetch: isBootstrapPhase
          ? graphqlBinding.refetch
          : contractBinding.refetch,
        source: "provisional" as const,
      };
    }

    // Priority 3: No data available
    if (isBootstrapPhase) {
      return {
        data: null,
        loading: graphqlBinding.loading,
        error: graphqlBinding.error,
        refetch: graphqlBinding.refetch,
        source: "graphql" as const,
      };
    } else {
      return {
        data: null,
        loading: contractBinding.isLoading,
        error: contractBinding.error,
        refetch: contractBinding.refetch,
        source: "contract" as const,
      };
    }
  }, [
    provisionalBinding,
    isBootstrapPhase,
    graphqlBinding.data,
    graphqlBinding.loading,
    graphqlBinding.error,
    graphqlBinding.refetch,
    contractBinding.data,
    contractBinding.isLoading,
    contractBinding.error,
    contractBinding.refetch,
  ]);

  return binding;
}

/**
 * Hook to check reverse binding - find all addresses bound to a given Imua address
 * Used to validate that the connected EVM address isn't already bound to different Bitcoin/XRP addresses
 * with provisional binding support and reconciliation
 *
 * @param imuaAddress - The Imua (EVM) address to check reverse bindings for
 * @param token - The token to check bindings for (determines chain type and custom chain ID)
 * @returns Binding data with source_addr (Bitcoin/XRP address) if found
 */
export function useReverseAddressBinding(imuaAddress: string, token: Token) {
  const { bootstrapStatus } = useBootstrapStatus();
  const isBootstrapPhase = !bootstrapStatus?.isBootstrapped;

  // Determine chain type based on network
  const chainType = useMemo(() => {
    if (token.network.chainName === "XRPL") return "XRP";
    if (
      token.network.chainName === "Bitcoin" ||
      token.network.chainName === "Bitcoin Testnet"
    )
      return "BTC";
    return null;
  }, [token.network.chainName]);

  const customChainId = token.network.customChainIdByImua;

  // Get provisional bindings from store
  // Reverse lookup: find binding where targetAddress matches imuaAddress
  const provisionalBindings = useAllWalletsStore(
    (state) => state.provisionalBindings,
  );

  const provisionalReverseBinding = useMemo(() => {
    if (!chainType || !imuaAddress) return null;

    // Search through all provisional bindings for this custom chain ID
    const matchingBinding = Object.values(provisionalBindings).find(
      (binding) =>
        binding.chainType === chainType &&
        binding.targetAddress.toLowerCase() === imuaAddress.toLowerCase(),
    );

    return matchingBinding || null;
  }, [provisionalBindings, chainType, imuaAddress]);

  // GraphQL reverse binding (bootstrap phase only)
  const graphqlReverseBinding = useBootstrapAddressBindingsByTarget(
    chainType || "",
    imuaAddress.toLowerCase(),
  );

  // Contract reverse binding (post-bootstrap phase only)
  const { readonlyContract: utxoGateway } = useUTXOGateway(xrpl);

  const contractReverseBinding = useQuery({
    queryKey: ["contract-reverse-binding", imuaAddress, customChainId],
    queryFn: async () => {
      if (!imuaAddress || !utxoGateway || isBootstrapPhase || !chainType)
        return null;

      try {
        // Call getClientAddress to get the bound client chain address for this Imua address
        // customChainId directly equals the client chain ID argument
        const boundClientAddress = (await utxoGateway.read.getClientAddress([
          customChainId,
          imuaAddress as `0x${string}`,
        ])) as `0x${string}`;

        // Check if the returned bytes are not empty
        if (!boundClientAddress || boundClientAddress === "0x") {
          return null;
        }

        // Convert bytes back to string address
        const hexString = boundClientAddress.startsWith("0x")
          ? boundClientAddress.slice(2)
          : boundClientAddress;
        const addressString = Buffer.from(hexString, "hex").toString("utf8");

        return {
          chain_type: chainType,
          source_addr: addressString,
          target_addr: imuaAddress.toLowerCase(),
        };
      } catch (error) {
        console.error("Error fetching reverse binding from contract:", error);
        return null;
      }
    },
    enabled: !!imuaAddress && !isBootstrapPhase && !!utxoGateway && !!chainType,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Extract the bound source address (Bitcoin/XRP address) from the binding data
  const boundSourceAddress = useMemo(() => {
    // Priority 1: Use network data (source of truth)
    if (isBootstrapPhase) {
      // Bootstrap phase: use GraphQL
      const networkData = graphqlReverseBinding.data?.source_addr || null;
      if (networkData) {
        return networkData;
      }
    } else {
      // Post-bootstrap phase: use contract
      const networkData = contractReverseBinding.data?.source_addr || null;
      if (networkData) {
        return networkData;
      }
    }

    // Priority 2: Use provisional binding (fallback during confirmation delay)
    if (provisionalReverseBinding) {
      return provisionalReverseBinding.sourceAddress;
    }

    // Priority 3: No data available
    return null;
  }, [
    provisionalReverseBinding,
    isBootstrapPhase,
    graphqlReverseBinding.data,
    contractReverseBinding.data,
  ]);

  // Determine loading state (only show loading if no data available)
  const isLoading =
    !boundSourceAddress &&
    (isBootstrapPhase
      ? graphqlReverseBinding.loading
      : contractReverseBinding.isLoading);

  // Determine error state (only show error if no data available)
  const error =
    !boundSourceAddress &&
    (isBootstrapPhase
      ? graphqlReverseBinding.error
      : contractReverseBinding.error);

  // Unified refetch function
  const refetch = isBootstrapPhase
    ? graphqlReverseBinding.refetch
    : contractReverseBinding.refetch;

  return {
    boundSourceAddress,
    isLoading,
    error,
    refetch,
  };
}
