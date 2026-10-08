import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { StrategyService } from './strategy.service.js';

const OptimizeExecutionInput = z.object({
  vpin: z.number().describe('Volume-Synchronized Probability of Toxicity (0 to 1)'),
  spread: z.number().describe('Bid-ask spread in basis points'),
  volatility: z.number().describe('Daily price volatility (daily std dev, e.g. 0.015)'),
  spoofingDetected: z.boolean().describe('Whether spoofing/manipulation was detected')
});

const OptimizeExecutionOutput = z.object({
  recommendedStrategy: z.enum(['WAIT', 'TWAP', 'VWAP', 'ICEBERG', 'MARKET']),
  confidence: z.number().describe('Rule confidence score (0 to 1)'),
  reasoning: z.string().describe('Rule rationale matching LLD')
});

const BacktestStrategyInput = z.object({
  strategy: z.enum(['TWAP', 'VWAP', 'MARKET']).describe('Strategy to backtest'),
  ticker: z.string().describe('Symbol ticker to backtest'),
  days: z.number().optional().default(30).describe('Historical backtesting days window')
});

const BacktestStrategyOutput = z.object({
  sharpeRatio: z.number(),
  totalReturn: z.number(),
  maxDrawdown: z.number(),
  winRate: z.number(),
  tradesCount: z.number()
});

@Injectable({ deps: [StrategyService] })
export class StrategyTools {
  constructor(private strategyService: StrategyService) {}

  @Tool({
    name: 'optimize_execution',
    description: 'Determine the best trading execution strategy (WAIT, TWAP, VWAP, ICEBERG, MARKET) based on deterministic market safety rules',
    inputSchema: OptimizeExecutionInput,
    outputSchema: OptimizeExecutionOutput
  })
  async optimizeExecution(
    { vpin, spread, volatility, spoofingDetected }: { vpin: number; spread: number; volatility: number; spoofingDetected: boolean },
    ctx: ExecutionContext
  ) {
    try {
      // Deterministic rule table mapping
      // Rule 1: Spoofing active
      if (spoofingDetected) {
        return {
          recommendedStrategy: 'WAIT' as const,
          confidence: 0.95,
          reasoning: 'Spoofing Alert: Large manipulative orders present. High risk of adverse selection.'
        };
      }

      // Rule 2: High flow toxicity
      if (vpin > 0.45) {
        return {
          recommendedStrategy: 'WAIT' as const,
          confidence: 0.90,
          reasoning: 'Toxic Order Flow: VPIN exceeds threshold (0.45). Adverse selection risk is too high.'
        };
      }

      // Rule 3: Mild flow toxicity
      if (vpin > 0.35) {
        return {
          recommendedStrategy: 'TWAP' as const,
          confidence: 0.80,
          reasoning: 'Mild Toxicity: VPIN is elevated (>0.35). Executing via TWAP to slice orders and minimize adverse routing.'
        };
      }

      // Rule 4: Illiquid book
      if (spread > 10) {
        return {
          recommendedStrategy: 'ICEBERG' as const,
          confidence: 0.85,
          reasoning: 'Illiquid Book: Spread exceeds 10 bps. Crossing the book is expensive. Utilizing Iceberg orders to rest liquidity.'
        };
      }

      // Rule 5: Volatility spike
      if (volatility > 0.03) {
        return {
          recommendedStrategy: 'TWAP' as const,
          confidence: 0.80,
          reasoning: 'Abnormal Volatility: Realized volatility exceeds 3%. Splitting execution over time to smooth price variance.'
        };
      }

      // Rule 6: Safe Liquid Market
      if (vpin < 0.30 && spread < 3 && volatility < 0.01) {
        return {
          recommendedStrategy: 'MARKET' as const,
          confidence: 0.90,
          reasoning: 'Safe Liquid Market: Low toxicity, tight spread (<3 bps), and low volatility (<1%). Execute immediately.'
        };
      }

      // Rule 7: Standard Liquid Market (Default)
      return {
        recommendedStrategy: 'VWAP' as const,
        confidence: 0.75,
        reasoning: 'Standard Liquid Market: Balanced microstructure metrics. Execute inline with historical volume profiles.'
      };
    } catch (error) {
      ctx.logger.error('Error optimizing execution strategy', { error: String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'backtest_strategy',
    description: 'Backtest a quantitative strategy (TWAP, VWAP, MARKET) on historical price candles',
    inputSchema: BacktestStrategyInput,
    outputSchema: BacktestStrategyOutput
  })
  async backtestStrategy(
    { strategy, ticker, days }: { strategy: 'TWAP' | 'VWAP' | 'MARKET'; ticker: string; days: number },
    ctx: ExecutionContext
  ) {
    try {
      const results = await this.strategyService.backtest(strategy, ticker, days);
      return results;
    } catch (error) {
      ctx.logger.error(`Error backtesting strategy ${strategy} on ${ticker}`, { error: String(error) });
      throw error;
    }
  }
}
