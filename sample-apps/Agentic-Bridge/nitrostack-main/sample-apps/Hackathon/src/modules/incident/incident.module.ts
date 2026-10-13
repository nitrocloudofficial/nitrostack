import { Module } from '@nitrostack/core';
import { IncidentTools } from './incident.tools.js';
import { IncidentPrompts } from './incident.prompts.js';

@Module({
  name: 'incident',
  description: 'Operational tools and prompts for the Incident Commander',
  controllers: [IncidentTools, IncidentPrompts]
})
export class IncidentModule {}
