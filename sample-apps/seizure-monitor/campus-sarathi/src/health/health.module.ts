import { Module } from '@nitrostack/core';
import { SystemHealthCheck } from './system.health.js';

@Module({
  name: 'health',
  description: 'System health checks',
  providers: [SystemHealthCheck],
  exports: [SystemHealthCheck]
})
export class HealthModule {}
