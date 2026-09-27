import { Module } from '@nitrostack/core';
import { MatchingTools } from './matching.tools.js';
import { DeliveryTools } from './delivery.tools.js';
import { CallingTools } from './calling.tools.js';
import { DataResources } from './data.resources.js';
import { SummaryPrompts } from './summary.prompts.js';

@Module({
  name: 'foodrescue',
  description: 'Agentic AI Food Rescue System core features',
  controllers: [
    MatchingTools,
    DeliveryTools,
    CallingTools,
    DataResources,
    SummaryPrompts
  ]
})
export class FoodRescueModule {}
