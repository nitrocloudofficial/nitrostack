import { Injectable, OnModuleInit } from '@nitrostack/core';
import { DatabaseService } from '../../services/database.service.js';
import { FactoryGateway } from '../../gateway/factory.gateway.js';
import { startFactoryGateway, stopFactoryGateway } from '../../gateway/factory-gateway.bootstrap.js';
import { LiveNotificationEvent, NotificationRecord } from './notification.types.js';
import type { LiveMonitoringEvent, MonitoringAlert, WorkflowTrackingRecord } from '../monitoring/monitoring.types.js';

@Injectable({ deps: [DatabaseService] })
export class NotificationRealtimeService implements OnModuleInit {
  private static readonly listeners = new Set<(event: LiveNotificationEvent) => void>();

  constructor(private readonly database: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    if (process.env.FACTORYBRAIN_WEBSOCKET_ENABLED === 'false') return;
    FactoryGateway.setRecoveryHandler((stream, afterSequence, workflowId) => stream === 'monitoring'
      ? this.recoverMonitoring(afterSequence).filter((event) => !workflowId || event.workflow.workflowId === workflowId)
      : this.recover(afterSequence).filter((event) => !workflowId || event.notification.workflowId === workflowId));
    await startFactoryGateway();
  }

  publish(notification: NotificationRecord): LiveNotificationEvent {
    const event: LiveNotificationEvent = {
      type: 'notification.updated', sequence: notification.sequence,
      timestamp: new Date().toISOString(), notification: structuredClone(notification),
    };
    FactoryGateway.publish(notification.workflowId, event.type, event);
    for (const listener of NotificationRealtimeService.listeners) listener(event);
    return event;
  }

  recover(afterSequence: number): LiveNotificationEvent[] {
    return this.database.listNotifications({ afterSequence }).map((notification) => ({
      type: 'notification.updated', sequence: notification.sequence,
      timestamp: notification.updatedAt, notification,
    }));
  }

  subscribe(listener: (event: LiveNotificationEvent) => void): () => void {
    NotificationRealtimeService.listeners.add(listener);
    return () => NotificationRealtimeService.listeners.delete(listener);
  }

  async publishMonitoring(workflow: WorkflowTrackingRecord, alert?: MonitoringAlert): Promise<LiveMonitoringEvent> {
    const event: LiveMonitoringEvent = {
      type: 'monitoring.updated', sequence: await this.database.nextMonitoringSequence(),
      timestamp: new Date().toISOString(), workflow: structuredClone(workflow),
      ...(alert ? { alert: structuredClone(alert) } : {}),
    };
    await this.database.saveMonitoringLiveEvent(event);
    FactoryGateway.publish(workflow.workflowId, event.type, event);
    return event;
  }

  recoverMonitoring(afterSequence: number): LiveMonitoringEvent[] {
    return this.database.listMonitoringLiveEvents(afterSequence);
  }

  close(): Promise<void> { return stopFactoryGateway(); }
}
