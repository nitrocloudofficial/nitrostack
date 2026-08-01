import { Module } from '@nitrostack/core';
import { MarketTools } from './market.tools.js';
import { DatabaseModule } from '../database/database.module.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  name: 'market',
  imports: [DatabaseModule, AiModule],
  controllers: [MarketTools],
})
export class MarketModule {}
