import { Module } from '@nitrostack/core';
import { MatchTradesTools } from './match-trades.tools.js';

@Module({
  name: 'match-trades',
  description: 'Tolerance-based matching between System A and System B trades',
  controllers: [MatchTradesTools],
})
export class MatchTradesModule {}