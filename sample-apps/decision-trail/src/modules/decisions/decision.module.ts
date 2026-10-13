import { Module } from '@nitrostack/core';
import { DecisionTools } from './decision.tools.js';

@Module({
  name: 'decisions',
  description: 'Agentic decision intelligence tools for Decision Trail',
  controllers: [DecisionTools]
})
export class DecisionModule {}
