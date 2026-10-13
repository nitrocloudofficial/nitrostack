import { Module } from '@nitrostack/core';
import { DecisionTools } from './decision.tools.js';

@Module({
  name: 'decision',
  description: 'Enterprise Decision Search',
  controllers: [DecisionTools]
})
export class DecisionModule {}
