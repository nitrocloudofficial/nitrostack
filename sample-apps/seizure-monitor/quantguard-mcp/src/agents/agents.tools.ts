import { ToolDecorator as Tool, Widget, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { OrchestratorService } from './orchestrator.service.js';

const TradingMemoInput = z.object({
  ticker: z.string().describe('Symbol to analyze (e.g. BTCUSDT, AAPL)'),
  account: z.string().describe('Trading account identifier (e.g. ACCT-01)')
});

const TradingMemoOutput = z.object({
  ticker: z.string(),
  timestamp: z.number(),
  liquidity: z.any(),
  toxicity: z.any(),
  spoofing: z.any(),
  volatility: z.any(),
  risk: z.any(),
  news: z.any(),
  recommendation: z.enum(['WAIT', 'TWAP', 'VWAP', 'ICEBERG', 'MARKET']),
  confidence: z.number(),
  reasoning: z.string()
});

@Injectable({ deps: [OrchestratorService] })
export class AgentsTools {
  constructor(private orchestrator: OrchestratorService) {}

  @Tool({
    name: 'generate_trading_memo',
    description: 'Execute the full multi-agent trading validation: fetch resources, run analytics, evaluate rules, and produce a natural-language memo explaining the safety and execution strategy recommendation',
    inputSchema: TradingMemoInput,
    outputSchema: TradingMemoOutput
  })
  @Widget('quantguard-dashboard')
  async generateTradingMemo(
    { ticker, account }: { ticker: string; account: string },
    ctx: ExecutionContext
  ) {
    try {
      const memo = await this.orchestrator.generateTradingMemo(ticker, account);
      return memo;
    } catch (error) {
      ctx.logger.error(`Error generating trading memo for ${ticker} (${account})`, { error: String(error) });
      throw error;
    }
  }
}
