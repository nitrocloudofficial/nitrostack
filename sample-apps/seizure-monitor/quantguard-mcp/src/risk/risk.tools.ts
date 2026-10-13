import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { RiskService } from './risk.service.js';

const AnalyzeRiskInput = z.object({
  account: z.string().describe('Trading account identifier'),
  positionTicker: z.string().describe('Ticker symbol for proposed trade (e.g. BTCUSDT)'),
  proposedSize: z.number().describe('Notional size of the proposed trade in USD')
});

const AnalyzeRiskOutput = z.object({
  var95: z.number(),
  expectedShortfall: z.number(),
  portfolioDrawdown: z.number(),
  riskApproved: z.boolean(),
  comments: z.string()
});

@Injectable({ deps: [RiskService] })
export class RiskTools {
  constructor(private riskService: RiskService) {}

  @Tool({
    name: 'analyze_risk',
    description: 'Assess proposed trade size against account VaR, leverage, and drawdown parameters to approve or reject the trade',
    inputSchema: AnalyzeRiskInput,
    outputSchema: AnalyzeRiskOutput
  })
  async analyzeRisk(
    { account, positionTicker, proposedSize }: { account: string; positionTicker: string; proposedSize: number },
    ctx: ExecutionContext
  ) {
    try {
      const state = await this.riskService.getRiskState(account);
      
      // Calculate potential new leverage with proposed size added
      const newExposure = state.currentExposure + proposedSize;
      const equity = state.currentExposure / state.leverage;
      const newLeverage = newExposure / equity;
      
      const newVar95 = newExposure * 0.025;
      const newExpectedShortfall = newExposure * 0.032;

      let riskApproved = true;
      let comments = 'Trade approved. Proposed position is within risk budget.';

      if (newLeverage > 3.5) {
        riskApproved = false;
        comments = `Trade rejected: leverage limit exceeded. Proposed trade pushes leverage to ${newLeverage.toFixed(2)}x (max limit: 3.5x).`;
      } else if (newVar95 > equity * 0.05) { // VaR cannot exceed 5% of equity
        riskApproved = false;
        comments = `Trade rejected: VaR limit exceeded. Potential VaR of $${newVar95.toFixed(2)} exceeds 5% equity threshold ($${(equity * 0.05).toFixed(2)}).`;
      }

      return {
        var95: Number(newVar95.toFixed(2)),
        expectedShortfall: Number(newExpectedShortfall.toFixed(2)),
        portfolioDrawdown: Number((state.maxDrawdown * 100).toFixed(2)), // in %
        riskApproved,
        comments
      };
    } catch (error) {
      ctx.logger.error(`Error in analyze_risk for account ${account}`, { error: String(error) });
      throw error;
    }
  }
}
