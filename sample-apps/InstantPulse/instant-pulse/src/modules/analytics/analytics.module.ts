import { Module } from '@nitrostack/core';
import { CommonModule } from '../../common/common.module.js';
import { AnalyticsTools } from './analytics.tools.js';

@Module({
  name: 'analytics',
  description: 'Cash-flow metrics and anomaly detection over normalized bank data',
  imports: [CommonModule],
  controllers: [AnalyticsTools],
})
export class AnalyticsModule {}
