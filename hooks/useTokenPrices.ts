import { useQueries } from "@tanstack/react-query";
import { COSMOS_CONFIG } from "@/config/cosmos";
import { Token } from "@/types/tokens";
import { Price, PriceResponse } from "@/types/price";

export function useTokenPrices(tokens: Token[]) {
  const results = useQueries({
    queries: tokens.map((token) => ({
      queryKey: ["tokenPrice", token],
      queryFn: async (): Promise<Price> => {
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
      refetchInterval: 60000,
    })),
  });

  const isLoading = results.some((p) => p.isLoading);
  const error = results.find((p) => p && p.error)?.error || null;

  return {
    prices: results,
    isLoading,
    error,
  };
}
