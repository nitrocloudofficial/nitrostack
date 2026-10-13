import { Module } from '@nitrostack/core';
import { SumoTools } from './sumo.tools.js';
import { SumoResources } from './sumo.resources.js';
import { SumoPrompts } from './sumo.prompts.js';

@Module({
  name: 'sumo',
  description: 'SUMO Traffic Simulation Pipeline Module',
  controllers: [SumoTools, SumoResources, SumoPrompts]
})
export class SumoModule {}
