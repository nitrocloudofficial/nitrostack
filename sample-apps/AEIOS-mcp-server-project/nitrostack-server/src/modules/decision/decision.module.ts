import { Module } from '@nitrostack/core';
import { DecisionTools } from './decision.tools.js';
import { DecisionService } from './decision.service.js';

@Module({
  name: 'decision',
  description: 'Enterprise Decision Engine — consensus evaluation, conflict resolution, and decision making',
  controllers: [DecisionTools],
  providers: [DecisionService],
  exports: [DecisionService],
})
export class DecisionModule {}
