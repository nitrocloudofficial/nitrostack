import { ToolDecorator as Tool, ExecutionContext, z, Widget } from '@nitrostack/core';
import yahooFinancePkg from 'yahoo-finance2';
const yahooFinance = new (yahooFinancePkg as any)();

export class MarketDataTools {
  @Widget('stock-price')
  @Tool({
    name: 'get_stock_price',
    description: 'Retrieve the current real-time stock price and historical data for a given ticker symbol.',
    inputSchema: z.object({
      ticker: z.string().describe('The stock ticker symbol (e.g., AAPL, MSFT)'),
      period: z.enum(['1D', '1W', '1M', '1Y']).default('1D').describe('The historical time period to fetch')
    })
  })
  async getStockPrice(
    input: { ticker: string; period: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Fetching live market data for ${input.ticker}`);
    
    try {
      const quote = await yahooFinance.quote(input.ticker);
      return {
        ticker: input.ticker.toUpperCase(),
        currentPrice: quote.regularMarketPrice,
        currency: quote.currency,
        period: input.period,
        status: 'success',
        data: `Live price data for ${input.ticker}: $${quote.regularMarketPrice} ${quote.currency}`
      };
    } catch (e: any) {
      return { status: 'error', error: e.message };
    }
  }

  @Widget('market-news')
  @Tool({
    name: 'get_market_news',
    description: 'Retrieve real market news articles for a specific stock.',
    inputSchema: z.object({
      ticker: z.string().describe('The stock ticker symbol to filter news by')
    })
  })
  async getMarketNews(
    input: { ticker: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Fetching live news for ${input.ticker}`);
    
    try {
      const result = await yahooFinance.search(input.ticker);
      return {
        topic: input.ticker.toUpperCase(),
        articles: result.news.slice(0, 5).map((news: any) => ({
          title: news.title,
          source: news.publisher,
          link: news.link
        }))
      };
    } catch (e: any) {
      return { status: 'error', error: e.message };
    }
  }
}
