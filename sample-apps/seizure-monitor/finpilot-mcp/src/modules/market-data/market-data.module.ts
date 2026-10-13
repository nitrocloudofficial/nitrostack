import { Module } from '@nitrostack/core';
import { MarketDataTools } from './market-data.tools.js';

@Module({
  name: 'market-data',
  controllers: [MarketDataTools],
})
export class MarketDataModule {}
