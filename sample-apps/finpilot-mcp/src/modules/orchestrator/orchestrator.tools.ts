import { ToolDecorator as Tool, ExecutionContext, z, Widget } from '@nitrostack/core';

export class OrchestratorTools {
  @Widget('orchestrator-plan')
  @Tool({
    name: 'orchestrate_financial_analysis',
    description: 'Coordinates multiple agents (Market Data, Financials, Valuation) to produce a unified analysis of a stock.',
    inputSchema: z.object({
      query: z.string().describe('The natural language question from the user (e.g. "Is AAPL a good buy right now?")'),
      ticker: z.string().describe('The target ticker symbol extracted from the query')
    })
  })
  async orchestrateAnalysis(
    input: { query: string; ticker: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Orchestrating full analysis for ${input.ticker} based on query: "${input.query}"`);
    
    // In a full implementation, this tool would internally call the LLM to route tasks 
    // to other tools, or programmatically call other MCP tools on the server.
    
    return {
      ticker: input.ticker.toUpperCase(),
      originalQuery: input.query,
      orchestrationPlan: [
        { step: 1, action: 'get_stock_price', agent: 'Market Data' },
        { step: 2, action: 'get_financial_statements', agent: 'Financials' },
        { step: 3, action: 'run_dcf_valuation', agent: 'Valuation' },
        { step: 4, action: 'generate_investment_report', agent: 'Report' }
      ],
      status: 'success'
    };
  }
}
