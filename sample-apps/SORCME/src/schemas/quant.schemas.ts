import { z } from "@nitrostack/core";

export const OrderRoutingSchema = z.object({
  pair: z.string().describe("The trading pair, e.g., 'SOL/USDT'"),
  usdAmount: z.number().describe("Total USD order size to execute"),
});

export type OrderRoutingInput = z.infer<typeof OrderRoutingSchema>;

export interface OrderBookLevel {
  exchange: "binance" | "coinbase";
  price: number;
  vol: number;
}

export const ArbitrageSchema = z.object({
  pair: z.string().describe("The trading pair, e.g., 'ETH/USDT'"),
  feeTier: z
    .number()
    .default(0.001)
    .describe("The taker fee percentage (e.g., 0.001 for 0.1%)"),
});
export type ArbitrageInput = z.infer<typeof ArbitrageSchema>;

export const CoinGeckoTickerQuerySchema = z.object({
  pair: z
    .string()
    .describe("Trading pair string, e.g., 'SOL/USDT' or 'ETH/USDT'"),
  exchanges: z
    .array(z.string())
    .optional()
    .default(["binance", "coinbase"])
    .describe("Exchange IDs to filter tickers by"),
});

export type CoinGeckoTickerQueryInput = z.infer<
  typeof CoinGeckoTickerQuerySchema
>;

export const CoinGeckoMarketSchema = z.object({
  name: z.string(),
  identifier: z.string(),
  has_trading_incentive: z.boolean().optional(),
});

export const CoinGeckoTickerItemSchema = z.object({
  base: z.string(),
  target: z.string(),
  market: CoinGeckoMarketSchema,
  last: z.coerce.number(),
  volume: z.coerce.number(),
  converted_last: z
    .object({
      btc: z.coerce.number().optional(),
      eth: z.coerce.number().optional(),
      usd: z.coerce.number().optional(),
    })
    .nullable()
    .optional(),
  converted_volume: z
    .object({
      btc: z.coerce.number().optional(),
      eth: z.coerce.number().optional(),
      usd: z.coerce.number().optional(),
    })
    .nullable()
    .optional(),
  trust_score: z.string().nullable().optional(),
  bid_ask_spread_percentage: z.coerce.number().nullable().optional(),
  timestamp: z.string().optional(),
  trade_url: z.string().nullable().optional(),
  token_info_url: z.string().nullable().optional(),
});

export const CoinGeckoTickersResponseSchema = z.object({
  name: z.string(),
  tickers: z.array(CoinGeckoTickerItemSchema),
});

export type CoinGeckoTickerItem = z.infer<typeof CoinGeckoTickerItemSchema>;
export type CoinGeckoTickersResponse = z.infer<
  typeof CoinGeckoTickersResponseSchema
>;

export const SimulateRiskSchema = z.object({
  pair: z.string().describe("Trading pair e.g. BTC/USDT"),
  buyVenue: z.string().describe("Exchange to buy on e.g. Binance"),
  sellVenue: z.string().describe("Exchange to sell on e.g. Coinbase"),
  buyPrice: z.number().describe("Ask price on buy venue"),
  sellPrice: z.number().describe("Bid price on sell venue"),
  targetUsd: z.number().describe("Total USD order size"),
  filledUsd: z.number().describe("USD amount filled by routing"),
  unfilledUsd: z.number().describe("USD amount left unfilled"),
});

export type SimulateRiskInput = z.infer<typeof SimulateRiskSchema>;
