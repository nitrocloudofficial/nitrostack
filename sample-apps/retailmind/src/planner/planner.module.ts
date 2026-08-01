import { Module } from '@nitrostack/core';
import { PlannerTools } from './planner.tools.js';
import { PlannerPrompts } from './planner.prompts.js';
import { MapsModule } from '../tools/maps/maps.module.js';
import { PlacesModule } from '../tools/places/places.module.js';
import { DemographicsModule } from '../tools/demographics/demographics.module.js';
import { TrafficModule } from '../tools/traffic/traffic.module.js';
import { OpportunityModule } from '../opportunity/opportunity.module.js';

@Module({
  name: 'planner',
  description: 'RetailMind AI Planner and Orchestration Module',
  imports: [MapsModule, PlacesModule, DemographicsModule, TrafficModule, OpportunityModule],
  controllers: [PlannerTools, PlannerPrompts]
})
export class PlannerModule {}