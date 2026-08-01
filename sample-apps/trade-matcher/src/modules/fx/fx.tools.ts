import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

const FX_RATES: Record<string, Record<string, number>> = {
  'USD/EUR': { '2026-07-24T09:00': 0.9123, '2026-07-24T14:00': 0.9145, '2026-07-24T16:00': 0.9151 },
  'USD/GBP': { '2026-07-24T09:00': 0.7821, '2026-07-24T14:00': 0.7834, '2026-07-24T16:00': 0.7840 },
  'EUR/GBP': { '2026-07-24T09:00': 0.8575, '2026-07-24T14:00': 0.8563, '2026-07-24T16:00': 0.8571 },
};

export class FxTools {
  @Tool({
    name: 'get_fx_rate_at_time',
    description: 'Get the FX rate for a currency pair at a given hour-level timestamp',
    inputSchema: z.object({
      pair: z.string().describe('Currency pair like USD/EUR'),
      timestamp: z.string().describe('ISO timestamp, hour precision, e.g. 2026-07-24T14:00'),
    }),
  })
  async getFxRateAtTime(input: { pair: string; timestamp: string }, ctx: ExecutionContext) {
    ctx.logger.info('Checking FX rate', { pair: input.pair, timestamp: input.timestamp });
    const rates = FX_RATES[input.pair];
    if (!rates) return { found: false, message: `No mock data for pair ${input.pair}` };
    const rate = rates[input.timestamp];
    if (rate === undefined) {
      return { found: false, message: `No exact rate at ${input.timestamp}`, closestAvailable: Object.keys(rates) };
    }
    return { found: true, pair: input.pair, timestamp: input.timestamp, rate };
  }
}