import { Module } from '@nitrostack/core';
import { FleetTools } from './fleet.tools.js';
import { FleetResources } from './fleet.resources.js';
import { FleetPrompts } from './fleet.prompts.js';

@Module({
  name: 'fleet',
  description: 'Agentic predictive maintenance for a fleet of turbofan engines: anomaly detection, failure prediction, and work order generation.',
  controllers: [FleetTools, FleetResources, FleetPrompts]
})
export class FleetModule {}
