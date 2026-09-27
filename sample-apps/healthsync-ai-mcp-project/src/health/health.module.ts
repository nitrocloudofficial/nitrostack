import { Module } from '@nitrostack/core';
import { HealthTools } from './health.tools.js';

@Module({
  name: 'health',
  controllers: [HealthTools],
})
export class HealthModule {}