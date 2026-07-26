import { Module } from '@nitrostack/core';
import { MonitoringTools } from './monitoring.tools.js';
import { MonitoringResources } from './monitoring.resources.js';

@Module({
  name: 'monitoring',
  description: 'Enterprise Monitoring Dashboard - service health, alerts, system resources',
  controllers: [MonitoringTools, MonitoringResources],
})
export class MonitoringModule {}
