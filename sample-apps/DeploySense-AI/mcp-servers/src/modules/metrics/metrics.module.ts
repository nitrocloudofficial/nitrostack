import { Module } from '@nitrostack/core';
import { MetricsService } from './metrics.service.js';
import { MetricsTools } from './metrics.tools.js';
import { ConfigModule } from '../config/config.module.js';

@Module({
  name: 'metricsmodule',
  imports: [ConfigModule],
  controllers: [MetricsTools],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}

