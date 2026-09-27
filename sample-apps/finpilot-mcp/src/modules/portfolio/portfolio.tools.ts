import { ToolDecorator as Tool, ExecutionContext, z, Widget } from '@nitrostack/core';
import yahooFinancePkg from 'yahoo-finance2';
const yahooFinance = new (yahooFinancePkg as any)();

export class PortfolioTools {
  @Widget('portfolio-diversification')
  @Tool({
    name: 'analyze_portfolio_diversification',
    description: 'Analyze the sector and asset class diversification of a given stock portfolio.',
    inputSchema: z.object({
      holdings: z.array(z.object({
        ticker: z.string().describe('Stock ticker symbol'),
        shares: z.number().describe('Number of shares held')
      })).describe('Array of portfolio holdings')
    })
  })
  async analyzeDiversification(
    input: { holdings: { ticker: string; shares: number }[] },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Analyzing portfolio diversification for ${input.holdings.length} assets`);
    
    try {
      let totalValue = 0;
      const sectors: Record<string, number> = {};
      const holdingDetails = [];

      for (const holding of input.holdings) {
        const quote = await yahooFinance.quote(holding.ticker);
        const summary = await yahooFinance.quoteSummary(holding.ticker, { modules: ['assetProfile'] });
        
        const price = quote.regularMarketPrice || 0;
        const value = price * holding.shares;
        totalValue += value;
        
        const sector = summary.assetProfile?.sector || 'Unknown';
        if (!sectors[sector]) sectors[sector] = 0;
        sectors[sector] += value;

        holdingDetails.push({
          ticker: holding.ticker.toUpperCase(),
          sector,
          value: `$${value.toFixed(2)}`
        });
      }

      // Convert sector values to percentages
      const sectorAllocation = Object.entries(sectors).map(([sector, value]) => ({
        sector,
        percentage: `${((value / totalValue) * 100).toFixed(1)}%`
      }));

      return {
        totalPortfolioValue: `$${totalValue.toFixed(2)}`,
        holdingsAnalyzed: input.holdings.length,
        sectorAllocation,
        holdingDetails,
        status: 'success'
      };
    } catch (e: any) {
      return { status: 'error', error: e.message };
    }
  }
}
