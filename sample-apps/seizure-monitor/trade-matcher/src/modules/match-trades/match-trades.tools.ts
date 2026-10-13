import { ToolDecorator as Tool, ExecutionContext, z, Widget } from '@nitrostack/core';
import { Trade, Break, MatchTradesOutput } from './match-trades.types.js';

const PRICE_TOLERANCE = 0.01;
const QUANTITY_TOLERANCE = 0;

export class MatchTradesTools {
  @Tool({
    name: 'match_trades',
    description: 'Compare System A and System B trades by symbol and flag breaks where price or quantity differ beyond tolerance',
    inputSchema: z.object({
      systemATrades: z.array(Trade).describe('Trade records from System A'),
      systemBTrades: z.array(Trade).describe('Trade records from System B'),
    }),
    invocation: {
      invoking: 'Matching trades across systems...',
      invoked: 'Trade matching complete',
    },
    examples: {
      request: {
        systemATrades: [{ symbol: 'INFY', price: 1500.5, quantity: 100 }],
        systemBTrades: [{ symbol: 'INFY', price: 1500.5, quantity: 90 }],
      },
      response: {
        breaks: [
          {
            breakId: 'break-INFY',
            tradeA: { symbol: 'INFY', price: 1500.5, quantity: 100 },
            tradeB: { symbol: 'INFY', price: 1500.5, quantity: 90 },
            discrepancy: 'Mismatch on INFY: quantity 100 vs 90',
          },
        ],
      },
    },
  })
  @Widget('trade-dashboard')
  async matchTrades(
    input: { systemATrades: Trade[] | string; systemBTrades: Trade[] | string },
    ctx: ExecutionContext
  ): Promise<MatchTradesOutput> {
    const systemATrades: Trade[] =
      typeof input.systemATrades === 'string' ? JSON.parse(input.systemATrades) : input.systemATrades;
    const systemBTrades: Trade[] =
      typeof input.systemBTrades === 'string' ? JSON.parse(input.systemBTrades) : input.systemBTrades;

    ctx.logger.info('Matching trades', {
      countA: systemATrades.length,
      countB: systemBTrades.length,
    });

    const breaks: Break[] = [];
    const matchedBSymbols = new Set<string>();

    for (const tradeA of systemATrades) {
      const tradeB = systemBTrades.find((t) => t.symbol === tradeA.symbol);
      if (!tradeB) {
        breaks.push({
          breakId: `break-${tradeA.symbol}`,
          tradeA,
          tradeB: null,
          discrepancy: `Trade for ${tradeA.symbol} missing in System B`,
        });
        continue;
      }
      matchedBSymbols.add(tradeB.symbol);
      const priceDiff = Math.abs(tradeA.price - tradeB.price);
      const quantityDiff = Math.abs(tradeA.quantity - tradeB.quantity);
      if (priceDiff > PRICE_TOLERANCE || quantityDiff > QUANTITY_TOLERANCE) {
        const parts: string[] = [];
        if (priceDiff > PRICE_TOLERANCE) {
          parts.push(`price ${tradeA.price} vs ${tradeB.price}`);
        }
        if (quantityDiff > QUANTITY_TOLERANCE) {
          parts.push(`quantity ${tradeA.quantity} vs ${tradeB.quantity}`);
        }
        breaks.push({
          breakId: `break-${tradeA.symbol}`,
          tradeA,
          tradeB,
          discrepancy: `Mismatch on ${tradeA.symbol}: ${parts.join(', ')}`,
        });
      }
    }

    for (const tradeB of systemBTrades) {
      if (!matchedBSymbols.has(tradeB.symbol)) {
        breaks.push({
          breakId: `break-${tradeB.symbol}`,
          tradeA: null,
          tradeB,
          discrepancy: `Trade for ${tradeB.symbol} missing in System A`,
        });
      }
    }

    ctx.logger.info('Match complete', { breaksFound: breaks.length });
    return { breaks };
  }
}