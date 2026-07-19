import { Module } from '@nitrostack/core';
import { HealthCheckTools } from './health-check.tool.js';

/**
 * HealthModule — health checks and server status
 */
@Module({
  name: 'health',
  description: 'Health checks and server status monitoring',
  controllers: [HealthCheckTools]
})
export class HealthModule {}
