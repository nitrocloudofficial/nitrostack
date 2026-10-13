import { Module } from '@nitrostack/core';
import { ServicesModule } from '../../services/services.module.js';
import { NotificationModule } from '../notification/notification.module.js';
import { DurationRulesService } from './duration-rules.service.js';
import { MockStatusService } from './mock-status.service.js';
import { MonitoringAgent } from './monitoring.agent.js';
import { MonitoringTools } from './monitoring.tools.js';
@Module({ name: 'monitoring', description: 'End-to-end stage tracking, deadlines, stalls, alerts, and live KPI updates', imports: [ServicesModule, NotificationModule], providers: [DurationRulesService, MockStatusService, MonitoringAgent], controllers: [MonitoringTools], exports: [MonitoringAgent] })
export class MonitoringModule {}
