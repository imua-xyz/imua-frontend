import { Token } from "./tokens";

export interface PriceResponse {
  price: {
    price: string;
    decimal: number;
    timestamp: string;
    round_id: string;
  };
}

export interface PricePerToken {
  token: Token;
  data: number;
  decimals: number;
  updatedAt: string;
}
