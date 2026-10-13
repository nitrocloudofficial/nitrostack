import { Module } from '@nitrostack/core';
import { TradeTools } from './trades.tools.js';

@Module({
  name: 'trades',
  description: 'Trade reconciliation between System A and System B',
  controllers: [TradeTools],
})
export class TradesModule {}