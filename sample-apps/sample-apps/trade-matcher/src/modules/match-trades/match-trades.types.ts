import { z } from '@nitrostack/core';

export const Trade = z.object({
  tradeId: z.string(),
  system: z.enum(['A', 'B']),
  symbol: z.string(),
  quantity: z.number(),
  price: z.number(),
  side: z.enum(['buy', 'sell']),
  timestamp: z.string(),
});
export type Trade = z.infer<typeof Trade>;

export const Break = z.object({
  breakId: z.string(),
  tradeA: Trade.nullable(),
  tradeB: Trade.nullable(),
  discrepancy: z.string(),
});
export type Break = z.infer<typeof Break>;

export const MatchTradesOutput = z.object({
  breaks: z.array(Break),
});
export type MatchTradesOutput = z.infer<typeof MatchTradesOutput>;