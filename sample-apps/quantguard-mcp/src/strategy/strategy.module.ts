import { Module } from '@nitrostack/core';
import { StrategyService } from './strategy.service.js';
import { StrategyTools } from './strategy.tools.js';
import { MarketModule } from '../market/market.module.js';

/**
 * StrategyModule — trading strategy management and backtesting
 */
@Module({
  name: 'strategy',
  description: 'Trading strategy management, execution, and backtesting',
  imports: [MarketModule],
  providers: [StrategyService],
  controllers: [StrategyTools],
  exports: [StrategyService, StrategyTools]
})
export class StrategyModule {}
