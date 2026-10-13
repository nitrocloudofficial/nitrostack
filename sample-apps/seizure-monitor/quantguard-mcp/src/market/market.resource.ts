import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';
import { MarketDataService } from './market-data.service.js';
import { MarketResourceSchema } from '../schemas/resources.schema.js';

/**
 * MarketResource — market://{ticker}
 * 
 * Provides current market data: price, OHLC, VWAP, spread, volume, market depth
 * Backed by MarketDataService with 2s cache TTL
 */
@Injectable({ deps: [MarketDataService] })
export class MarketResource {
  constructor(private marketDataService: MarketDataService) {}

  @Resource({
    name: 'market',
    description: 'Get current market data for a ticker (price, OHLC, VWAP, spread, volume, market depth)',
    uri: 'market://{ticker}'
  })
  async getMarketData(
    { ticker }: { ticker: string },
    ctx: ExecutionContext
  ) {
    try {
      // Fetch data in parallel
      const [price, ohlcv, vwap, spread, marketDepth] = await Promise.all([
        this.marketDataService.getPrice(ticker),
        this.marketDataService.getOHLCV(ticker, '1d'),
        this.marketDataService.getVWAP(ticker, '1d'),
        this.marketDataService.getSpread(ticker),
        this.marketDataService.getMarketDepth(ticker, 5)
      ]);

      // Extract OHLC from latest candle
      const latestCandle = ohlcv[ohlcv.length - 1];
      const ohlc = {
        open: latestCandle.open,
        high: latestCandle.high,
        low: latestCandle.low,
        close: latestCandle.close
      };

      // Calculate total volume from all candles
      const volume = ohlcv.reduce((sum, candle) => sum + candle.volume, 0);

      return {
        ticker,
        currentPrice: price,
        ohlc,
        vwap,
        spread,
        volume,
        marketDepth,
        timestamp: Date.now()
      };
    } catch (error) {
      ctx.logger.error(`Failed to fetch market data for ${ticker}`, { error: String(error) });
      throw error;
    }
  }
}
