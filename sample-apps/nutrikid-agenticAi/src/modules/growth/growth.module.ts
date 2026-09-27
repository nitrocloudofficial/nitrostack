import { Module } from '@nitrostack/core';
import { GrowthTools } from './growth.tools.js';
import { GrowthResources } from './growth.resources.js';
import { GrowthPrompts } from './growth.prompts.js';

@Module({
  name: 'growth',
  description: 'Pediatric Growth & Stature Analytics Module',
  controllers: [
    GrowthTools,
    GrowthResources,
    GrowthPrompts,
  ],
  providers: [
    GrowthTools,
    GrowthResources,
    GrowthPrompts,
  ],
  exports: [
    GrowthTools,
    GrowthResources,
    GrowthPrompts,
  ],
})
export class GrowthModule {}
