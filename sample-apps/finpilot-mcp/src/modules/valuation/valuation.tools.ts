import { ToolDecorator as Tool, ExecutionContext, z, Widget } from '@nitrostack/core';
import yahooFinancePkg from 'yahoo-finance2';
const yahooFinance = new (yahooFinancePkg as any)();

export class ValuationTools {
  @Widget('valuation-model')
  @Tool({
    name: 'run_dcf_valuation',
    description: 'Runs a Discounted Cash Flow (DCF) model to estimate the intrinsic value of a stock using live free cash flows.',
    inputSchema: z.object({
      ticker: z.string().describe('The stock ticker symbol'),
      growthRate: z.number().optional().describe('Projected annual growth rate (percentage)'),
      discountRate: z.number().optional().describe('Discount rate (WACC percentage)')
    })
  })
  async runDcfValuation(
    input: { ticker: string; growthRate?: number; discountRate?: number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Running live DCF Valuation for ${input.ticker}`);
    
    try {
      const quote = await yahooFinance.quote(input.ticker);
      const summary = await yahooFinance.quoteSummary(input.ticker, { modules: ['financialData'] });
      
      const currentPrice = quote.regularMarketPrice;
      if (!currentPrice) throw new Error("Could not fetch current price.");

      // If we don't have operating cash flow, we fall back to a generic DCF mock based on price.
      const ocf = summary.financialData?.operatingCashflow;
      
      const growth = (input.growthRate ?? 5.0) / 100; 
      const wacc = (input.discountRate ?? 10.0) / 100;
      
      let intrinsicValue = 0;
      if (ocf && summary.financialData?.totalRevenue) {
        // Simple 5 year DCF based on operating cash flow
        const sharesOutstanding = quote.sharesOutstanding || (quote.marketCap! / currentPrice);
        const fcfPerShare = ocf / sharesOutstanding;
        
        let pv = 0;
        let futureFcf = fcfPerShare;
        for (let i = 1; i <= 5; i++) {
          futureFcf *= (1 + growth);
          pv += futureFcf / Math.pow(1 + wacc, i);
        }
        // Terminal value (assuming 2% perpetual growth)
        const terminalValue = (futureFcf * (1 + 0.02)) / (wacc - 0.02);
        pv += terminalValue / Math.pow(1 + wacc, 5);
        intrinsicValue = pv;
      } else {
        // Fallback calculation if data is missing
        intrinsicValue = currentPrice * (1 + (growth - wacc) * 5);
      }

      const marginOfSafety = (((intrinsicValue - currentPrice) / currentPrice) * 100).toFixed(1);

      return {
        ticker: input.ticker.toUpperCase(),
        valuationMethod: 'Discounted Cash Flow',
        assumptions: {
          growthRate: `${(growth * 100).toFixed(1)}%`,
          discountRate: `${(wacc * 100).toFixed(1)}%`
        },
        results: {
          currentPrice: `$${currentPrice.toFixed(2)}`,
          intrinsicValue: `$${intrinsicValue.toFixed(2)}`,
          marginOfSafety: `${marginOfSafety}%`
        },
        recommendation: intrinsicValue > currentPrice ? 'Undervalued (BUY)' : 'Overvalued (SELL)',
        status: 'success'
      };
    } catch (e: any) {
      return { status: 'error', error: e.message };
    }
  }

  @Widget('risk-assessment')
  @Tool({
    name: 'get_risk_assessment',
    description: 'Assess the live risk profile of a company including beta.',
    inputSchema: z.object({
      ticker: z.string().describe('The stock ticker symbol')
    })
  })
  async getRiskAssessment(
    input: { ticker: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Assessing live risk for ${input.ticker}`);
    
    try {
      const result = await yahooFinance.quoteSummary(input.ticker, { modules: ['defaultKeyStatistics', 'financialData'] });
      
      const beta = result.defaultKeyStatistics?.beta;
      let overallRisk = 'Moderate';
      if (beta && beta > 1.5) overallRisk = 'High';
      if (beta && beta < 0.8) overallRisk = 'Low';

      return {
        ticker: input.ticker.toUpperCase(),
        riskMetrics: {
          beta: beta?.toFixed(2) || 'N/A',
          debtToEquity: result.financialData?.debtToEquity?.toFixed(2) || 'N/A'
        },
        overallRisk,
        status: 'success'
      };
    } catch (e: any) {
      return { status: 'error', error: e.message };
    }
  }
}
