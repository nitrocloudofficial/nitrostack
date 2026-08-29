import { Module } from '@nitrostack/core';
import { ScoringTools } from './scoring.tools.js';

@Module({
  name: 'scoring',
  description: 'Polygenic risk score calculation using weighted-sum method',
  controllers: [ScoringTools],
})
export class ScoringModule {}
