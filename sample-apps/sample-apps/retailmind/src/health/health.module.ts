import { Module } from '@nitrostack/core';
import { SystemHealthCheck } from './system.health.js';

@Module({
  name: 'health',
  description: 'System health and monitoring module',
  controllers: [SystemHealthCheck]
})
export class HealthModule {}

