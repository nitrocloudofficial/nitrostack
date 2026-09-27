import { Module } from '@nitrostack/core';
import { IncidentTools } from './incident.tools.js';

@Module({
  name: 'incident',
  description: 'AI Incident Commander for high-stakes emergencies',
  controllers: [IncidentTools],
})
export class IncidentModule {}
