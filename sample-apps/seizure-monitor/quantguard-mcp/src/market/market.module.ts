import { Module } from '@nitrostack/core';
import { YahooFinanceProvider } from './providers/yahoo-finance.provider.js';
import { MarketDataService } from './market-data.service.js';
import { MarketResource } from './market.resource.js';

/**
 * MarketModule — market data providers and price feeds
 */
@Module({
  name: 'market',
  description: 'Market data providers (Yahoo Finance, Polygon.io, etc.)',
  providers: [YahooFinanceProvider, MarketDataService],
  controllers: [MarketResource],
  exports: [YahooFinanceProvider, MarketDataService]
})
export class MarketModule {}
