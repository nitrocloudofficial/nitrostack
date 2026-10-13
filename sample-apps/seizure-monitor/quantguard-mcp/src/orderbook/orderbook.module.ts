import { Module } from '@nitrostack/core';
import { OrderbookService } from './orderbook.service.js';
import { OrderBookResource } from './orderbook.resource.js';
import { DbModule } from '../db/db.module.js';
import { MarketModule } from '../market/market.module.js';
import { MarketTools } from '../market/market.tools.js';
import { DemoDataService } from '../market/demo-data.service.js';

/**
 * OrderbookModule — orderbook management and analysis
 */
@Module({
  name: 'orderbook',
  description: 'Orderbook management, snapshots, and microstructure analysis',
  imports: [DbModule, MarketModule],
  providers: [OrderbookService, DemoDataService],
  controllers: [OrderBookResource, MarketTools],
  exports: [OrderbookService, OrderBookResource, MarketTools, DemoDataService]
})
export class OrderbookModule {}
