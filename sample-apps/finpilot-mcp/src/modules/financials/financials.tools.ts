import { ToolDecorator as Tool, ExecutionContext, z, Widget } from '@nitrostack/core';
import yahooFinancePkg from 'yahoo-finance2';
const yahooFinance = new (yahooFinancePkg as any)();
export class FinancialTools {
  @Widget('financial-dashboard')
  @Tool({
    name: 'get_financial_statements',
    description: 'Retrieve the income statement, balance sheet, or cash flow statement for a company.',
    inputSchema: z.object({
      ticker: z.string().describe('The stock ticker symbol'),
      statementType: z.enum(['income_statement', 'balance_sheet', 'cash_flow']).describe('The type of financial statement to retrieve'),
      period: z.enum(['annual', 'quarterly']).default('annual').describe('The reporting period')
    })
  })
  async getFinancialStatements(
    input: { ticker: string; statementType: string; period: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Fetching live ${input.period} ${input.statementType} for ${input.ticker}`);
    
    try {
      const result = await yahooFinance.quoteSummary(input.ticker, { modules: ['financialData'] });
      
      const formatNum = (num?: number) => {
        if (!num) return 'N/A';
        if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
        if (num <= -1e9) return `-$${(Math.abs(num) / 1e9).toFixed(1)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
        if (num <= -1e6) return `-$${(Math.abs(num) / 1e6).toFixed(1)}M`;
        return `$${num.toLocaleString()}`;
      };

      return {
        ticker: input.ticker.toUpperCase(),
        statementType: input.statementType,
        period: input.period,
        metrics: {
          revenue: formatNum(result.financialData?.totalRevenue),
          netIncome: formatNum(result.financialData?.netIncomeToCommon),
          operatingCashFlow: formatNum(result.financialData?.operatingCashflow)
        },
        status: 'success'
      };
    } catch (e: any) {
      return { status: 'error', error: e.message };
    }
  }

  @Widget('financial-ratios')
  @Tool({
    name: 'calculate_financial_ratios',
    description: 'Calculate and retrieve key financial ratios like P/E, Debt-to-Equity, and ROE.',
    inputSchema: z.object({
      ticker: z.string().describe('The stock ticker symbol')
    })
  })
  async calculateRatios(
    input: { ticker: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Calculating live ratios for ${input.ticker}`);
    
    try {
      const result = await yahooFinance.quoteSummary(input.ticker, { modules: ['financialData', 'defaultKeyStatistics'] });
      return {
        ticker: input.ticker.toUpperCase(),
        ratios: {
          peRatio: result.defaultKeyStatistics?.forwardPE?.toFixed(2) || 'N/A',
          debtToEquity: result.financialData?.debtToEquity?.toFixed(2) || 'N/A',
          returnOnEquity: result.financialData?.returnOnEquity ? `${(result.financialData.returnOnEquity * 100).toFixed(1)}%` : 'N/A'
        },
        status: 'success'
      };
    } catch (e: any) {
      return { status: 'error', error: e.message };
    }
  }
}
