import { useQueries } from "@tanstack/react-query";
import { COSMOS_CONFIG } from "@/config/cosmos";
import { getTokenKey, Token } from "@/types/tokens";
import { PricePerToken, PriceResponse } from "@/types/price";

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
  const results = useQueries({
    queries: tokens.map((token) => ({
      queryKey: ["tokenPrice", token],
      queryFn: async (): Promise<PricePerToken> => {
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
  const error =
    Array.from(prices.values()).find((p) => p && p.error)?.error || null;

  return {
    data: prices,
    isLoading,
    error,
  };
}
