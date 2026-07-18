import { Module } from '@nitrostack/core';
import { MatchingService } from './matching.service.js';
import { MatchingTools } from './matching.tools.js';

@Module({
  name: 'matching',
  description: 'Specialty matching and hospital/doctor recommendation',
  controllers: [MatchingTools],
  providers: [MatchingService],
})
export class MatchingModule {}
