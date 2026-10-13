import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

interface Trade {
  tradeId: string;
  system: 'A' | 'B';
  symbol: string;
  quantity: number;
  price: number;
  side: 'buy' | 'sell';
  timestamp: string;
}

const systemATrades: Trade[] = [
  { tradeId: 'A1', system: 'A', symbol: 'TCS',      quantity: 100, price: 3450.50, side: 'buy',  timestamp: '2026-07-25T09:15:00Z' },
  { tradeId: 'A2', system: 'A', symbol: 'INFY',     quantity: 50,  price: 1520.00, side: 'sell', timestamp: '2026-07-25T09:20:00Z' },
  { tradeId: 'A3', system: 'A', symbol: 'RELIANCE', quantity: 200, price: 2890.00, side: 'buy',  timestamp: '2026-07-25T09:25:00Z' },
  { tradeId: 'A4', system: 'A', symbol: 'HDFCBANK', quantity: 75,  price: 1675.25, side: 'sell', timestamp: '2026-07-25T09:30:00Z' },
  { tradeId: 'A5', system: 'A', symbol: 'WIPRO',    quantity: 300, price: 410.00,  side: 'buy',  timestamp: '2026-07-25T09:35:00Z' },
  { tradeId: 'A6', system: 'A', symbol: 'ITC',      quantity: 150, price: 445.75,  side: 'sell', timestamp: '2026-07-25T09:40:00Z' },
  { tradeId: 'A7', system: 'A', symbol: 'SBIN',     quantity: 120, price: 812.30,  side: 'buy',  timestamp: '2026-07-25T09:45:00Z' },
  { tradeId: 'A8', system: 'A', symbol: 'AXISBANK', quantity: 60,  price: 1105.00, side: 'sell', timestamp: '2026-07-25T09:50:00Z' },
];

const systemBTrades: Trade[] = [
  { tradeId: 'B1', system: 'B', symbol: 'TCS',      quantity: 100, price: 3450.50,  side: 'buy',  timestamp: '2026-07-25T09:15:05Z' },
  { tradeId: 'B2', system: 'B', symbol: 'INFY',     quantity: 50,  price: 1521.00,  side: 'sell', timestamp: '2026-07-25T09:20:10Z' },
  { tradeId: 'B3', system: 'B', symbol: 'RELIANCE', quantity: 200, price: 2890.00,  side: 'buy',  timestamp: '2026-07-25T09:25:05Z' },
  { tradeId: 'B4', system: 'B', symbol: 'HDFCBANK', quantity: 80,  price: 1675.25,  side: 'sell', timestamp: '2026-07-25T09:30:05Z' },
  { tradeId: 'B5', system: 'B', symbol: 'WIPRO',    quantity: 300, price: 410.00,   side: 'buy',  timestamp: '2026-07-25T09:35:03Z' },
  { tradeId: 'B7', system: 'B', symbol: 'SBIN',     quantity: 120, price: 812.30,   side: 'buy',  timestamp: '2026-07-25T09:45:04Z' },
  { tradeId: 'B8', system: 'B', symbol: 'AXISBANK', quantity: 60,  price: 1105.00,  side: 'sell', timestamp: '2026-07-25T10:35:00Z' },
  { tradeId: 'B9', system: 'B', symbol: 'MARUTI',   quantity: 25,  price: 11250.00, side: 'buy',  timestamp: '2026-07-25T09:55:00Z' },
];

export class TradeTools {
  @Tool({
    name: 'load_trades',
    description: 'Load mock trades from System A and/or System B',
    inputSchema: z.object({
      system: z.enum(['A', 'B', 'both']).default('both')
        .describe('Which system to load trades from'),
    }),
    examples: {
      request: { system: 'both' },
      response: { trades: [{ tradeId: 'A1', system: 'A', symbol: 'TCS', quantity: 100, price: 3450.50, side: 'buy', timestamp: '2026-07-25T09:15:00Z' }] },
    },
  })
  async loadTrades(input: { system: 'A' | 'B' | 'both' }, ctx: ExecutionContext) {
    ctx.logger.info('Loading trades', { system: input.system });

    if (input.system === 'A') return { trades: systemATrades };
    if (input.system === 'B') return { trades: systemBTrades };
    return { trades: [...systemATrades, ...systemBTrades] };
  }
}