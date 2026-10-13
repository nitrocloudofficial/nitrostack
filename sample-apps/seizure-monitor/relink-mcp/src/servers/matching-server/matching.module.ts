import { Module } from '@nitrostack/core';
import { MatchingTools } from './matching.tools.js';

@Module({
  name: 'MatchingModule',
  controllers: [MatchingTools],
  providers: [MatchingTools],
  exports: [MatchingTools],
})
export class MatchingModule {}
