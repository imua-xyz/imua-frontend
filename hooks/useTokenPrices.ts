import { useQueries, useQuery } from "@tanstack/react-query";
import { COSMOS_CONFIG } from "@/config/cosmos";
import { getTokenKey, Token } from "@/types/tokens";
import { PricePerToken, PriceResponse } from "@/types/price";
import { useBootstrapStatus } from "./useBootstrapStatus";
import { apolloClient } from "@/lib/graphql/client";
import { GET_BOOTSTRAP_TOKEN_PRICES } from "@/lib/graphql/queries";
import { BootstrapTokenPrice } from "@/lib/graphql/schema";

export function useTokenPrices(tokens: Token[]): {
  data: Map<
    string,
    {
      data: PricePerToken | undefined;
      isLoading: boolean;
      error: Error | null;
    }
  >;
  isLoading: boolean;
  error: Error | null;
} {
  const { bootstrapStatus } = useBootstrapStatus();

  // Fetch all token prices once from GraphQL in bootstrap phase
  const bootstrapPricesQuery = useQuery({
    queryKey: ["bootstrap_token_prices"],
    queryFn: async () => {
      const { data } = await apolloClient.query<{
        bootstrap_token_prices: BootstrapTokenPrice[];
      }>({
        query: GET_BOOTSTRAP_TOKEN_PRICES,
        fetchPolicy: "network-only", // TanStack Query handles caching
      });
      // Build a map for quick lookup
      const pricesMap = new Map<string, number>();
      (data?.bootstrap_token_prices ?? []).forEach((priceData) => {
        pricesMap.set(priceData.asset_id.toLowerCase(), priceData.price);
      });
      return pricesMap;
    },
    enabled: !!bootstrapStatus && !bootstrapStatus?.isBootstrapped,
    staleTime: 10000,
    refetchInterval: 30000,
  });

  const results = useQueries({
    queries: tokens.map((token) => ({
      queryKey: [
        "tokenPrice",
        token,
        bootstrapStatus?.isBootstrapped, // Include bootstrap status in query key
      ],
      queryFn: async (): Promise<PricePerToken> => {
        // Bootstrap phase: use cached GraphQL data
        if (!bootstrapStatus?.isBootstrapped) {
          const assetId = `${token.address.toLowerCase()}_0x${token.network.customChainIdByImua.toString(16)}`;
          const bootstrapPricesMap = bootstrapPricesQuery.data;
          const priceFloat = bootstrapPricesMap?.get(assetId) ?? 0;

          // GraphQL returns float price (e.g., 1.23 USD), but we need to match RPC format
          // RPC returns big integer with decimals (e.g., 1230000 with 6 decimals = $1.23)
          // Assuming price decimals are 6 (standard for USD prices)
          const priceDecimals = 6;
          const priceAsInteger = Math.floor(
            priceFloat * Math.pow(10, priceDecimals),
          );

          return {
            token,
            data: priceAsInteger,
            decimals: priceDecimals,
            updatedAt: new Date().toISOString(),
          };
        }

        // Post-bootstrap: fetch from Imuachain RPC
        const url = `${COSMOS_CONFIG.API_ENDPOINT}${COSMOS_CONFIG.PATHS.TOKEN_PRICE(token.priceIndex)}`;
        const resp = await fetch(url);
        if (!resp.ok)
          throw new Error(`Failed to fetch price for ${token.symbol}`);
        const data = (await resp.json()) as PriceResponse;
        const priceData = data.price;
        return {
          token,
          data: Number(priceData.price),
          decimals: priceData.decimal,
          updatedAt: priceData.timestamp,
        };
      },
      enabled:
        !!bootstrapStatus &&
        (bootstrapStatus.isBootstrapped
          ? true
          : !bootstrapPricesQuery.isLoading), // Wait for bootstrap prices
      staleTime: 10000,
      refetchInterval: 30000,
    })),
  });

  const prices = new Map<
    string,
    {
      data: PricePerToken | undefined;
      isLoading: boolean;
      error: Error | null;
    }
  >();

  results.forEach((result, index) => {
    const token = tokens[index];
    const tokenKey = getTokenKey(token);
    prices.set(tokenKey, {
      data: result.data,
      isLoading: result.isLoading,
      error: result.error,
    });
  });

  const isLoading = Array.from(prices.values()).some((p) => p.isLoading);
  const error = Array.from(prices.values()).find((p) => p.error)?.error || null;

  return {
    data: prices,
    isLoading,
    error,
  };
}
