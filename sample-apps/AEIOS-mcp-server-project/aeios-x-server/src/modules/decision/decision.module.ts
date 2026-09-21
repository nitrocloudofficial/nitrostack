import { Module } from '@nitrostack/core';
import { DecisionTools } from './decision.tools.js';

@Module({
  name: 'decision',
  description: 'Enterprise Decision Engine - consensus evaluation, conflict resolution, and decision making',
  controllers: [DecisionTools],
})
export class DecisionModule {}
