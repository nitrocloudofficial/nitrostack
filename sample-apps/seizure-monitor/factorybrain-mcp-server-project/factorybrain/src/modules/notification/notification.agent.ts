import { Injectable, OnModuleInit } from '@nitrostack/core';
import { DatabaseService } from '../../services/database.service.js';
import { AgentEvent, QueueService } from '../../services/queue.service.js';
import type { ApprovalRequest, ManagerWorkflow } from '../manager/manager.types.js';
import { ManagerWorkflowState } from '../manager/manager.types.js';
import { MessageTemplateService } from './message-template.service.js';
import { NotificationDeliveryService } from './notification-delivery.service.js';
import { NotificationRealtimeService } from './notification-realtime.service.js';
import { approvedPlanSchema } from './notification.schemas.js';
import { RecipientConfigService } from './recipient-config.service.js';
import { ApprovedPlanInput, NotificationAuditLog, NotificationRecord, NotificationStatus } from './notification.types.js';
import { ORCHESTRATOR_JOBS } from '../../orchestrator/orchestrator.jobs.js';

@Injectable({ deps: [DatabaseService, QueueService, RecipientConfigService, MessageTemplateService, NotificationDeliveryService, NotificationRealtimeService] })
export class NotificationAgent implements OnModuleInit {
  constructor(
    private readonly database: DatabaseService, private readonly queue: QueueService,
    private readonly recipients: RecipientConfigService, private readonly templates: MessageTemplateService,
    private readonly delivery: NotificationDeliveryService, private readonly realtime: NotificationRealtimeService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.database.initializeNotifications();
    this.queue.registerHandler('notification', ORCHESTRATOR_JOBS.RUN_NOTIFICATION, (event) => this.handleApprovedWorkflow(event));
    this.queue.registerHandler('notification', 'retry_delivery', async (event) => { await this.retryNotification((event.payload as { notificationId: string }).notificationId); });
  }

  standardize(payload: unknown): ApprovedPlanInput {
    const source = payload as { workflow?: ManagerWorkflow; approval?: ApprovalRequest; report?: ManagerWorkflow['report'] };
    if (!source.workflow || !source.approval || !source.report || !source.workflow.maintenance || !source.workflow.production) {
      throw new Error('Approved Manager workflow is incomplete');
    }
    const standardized: ApprovedPlanInput = {
      workflowId: source.workflow.workflowId, ticketId: source.workflow.ticketId, machineId: source.workflow.machineId,
      approvedAt: source.approval.decidedAt ?? source.approval.requestedAt,
      approvedBy: source.approval.decidedBy ?? 'Manager Agent', approval: source.approval, report: source.report,
      maintenance: source.workflow.maintenance, purchase: source.workflow.purchase, production: source.workflow.production,
      originalRequester: source.workflow.purchase?.recommendation.purchaseRequest.requestedBy ?? 'Maintenance Agent',
    };
    return approvedPlanSchema.parse(standardized) as unknown as ApprovedPlanInput;
  }

  async notifyTeams(input: ApprovedPlanInput): Promise<NotificationRecord[]> {
    const results: NotificationRecord[] = [];
    for (const recipient of this.recipients.resolve(input)) {
      const content = this.templates.render(recipient.audience, input);
      const duplicateKey = `${input.approval.approvalId}:${recipient.audience}:${recipient.address}`;
      const now = new Date().toISOString();
      const record: NotificationRecord = {
        notificationId: `NOTIFY-${input.approval.approvalId}-${recipient.recipientId}`,
        duplicateKey, sequence: await this.database.nextNotificationSequence(), workflowId: input.workflowId,
        approvalId: input.approval.approvalId, audience: recipient.audience, channel: recipient.channel, recipient,
        ...content, status: NotificationStatus.Pending, attempts: 0,
        maxAttempts: Number(process.env.FACTORYBRAIN_NOTIFICATION_ATTEMPTS ?? 3), createdAt: now, updatedAt: now,
      };
      const saved = await this.database.createNotification(record);
      if (!saved.created) {
        await this.audit(input.workflowId, saved.notification.notificationId, 'duplicate_notification_suppressed', { duplicateKey });
        results.push(saved.notification); continue;
      }
      results.push(await this.deliver(saved.notification));
    }
    return results;
  }

  async retryNotification(notificationId: string): Promise<NotificationRecord> {
    const notification = this.database.findNotification(notificationId);
    if (!notification) throw new Error(`Unknown notification: ${notificationId}`);
    if (notification.status === NotificationStatus.Sent) return notification;
    const result = await this.deliver(notification);
    if (result.status === NotificationStatus.Sent) await this.resumeMonitoringIfReady(result.workflowId);
    return result;
  }

  private async handleApprovedWorkflow(event: AgentEvent<unknown>): Promise<void> {
    const input = this.standardize(event.payload);
    await this.audit(input.workflowId, undefined, 'approved_plan_received', { approvalId: input.approval.approvalId });
    const notifications = await this.notifyTeams(input);
    const notifiedAt = new Date().toISOString();
    await this.handoffToMonitoringIfReady(input, notifications, notifiedAt);
  }

  private async deliver(notification: NotificationRecord): Promise<NotificationRecord> {
    notification.status = NotificationStatus.Sending; notification.attempts += 1; notification.updatedAt = new Date().toISOString();
    await this.database.updateNotification(notification); this.realtime.publish(notification);
    try {
      await this.delivery.send(notification);
      notification.status = NotificationStatus.Sent; notification.sentAt = new Date().toISOString(); notification.updatedAt = notification.sentAt; delete notification.lastError;
      await this.database.updateNotification(notification); this.realtime.publish(notification);
      await this.audit(notification.workflowId, notification.notificationId, 'notification_sent', { attempt: notification.attempts, audience: notification.audience });
    } catch (error) {
      notification.status = NotificationStatus.Failed; notification.lastError = error instanceof Error ? error.message : String(error); notification.updatedAt = new Date().toISOString();
      await this.database.updateNotification(notification); this.realtime.publish(notification);
      await this.audit(notification.workflowId, notification.notificationId, 'notification_failed', { attempt: notification.attempts, error: notification.lastError });
      if (notification.attempts < notification.maxAttempts) {
        await this.queue.publish({ from: 'notification', to: 'notification', type: 'retry_delivery', payload: { notificationId: notification.notificationId } },
          { idempotencyKey: `notification-retry-${notification.notificationId}-${notification.attempts}`, attempts: notification.maxAttempts - notification.attempts });
      } else {
        await this.reportManagerState(notification.workflowId, ManagerWorkflowState.Failed, {
          reason: 'Required notification delivery exhausted all retries',
          notificationId: notification.notificationId,
          error: notification.lastError,
        });
      }
    }
    return notification;
  }

  private async resumeMonitoringIfReady(workflowId: string): Promise<void> {
    const workflow = this.database.findManagerWorkflow(workflowId);
    if (!workflow?.approvalId || !workflow.report) return;
    const approval = this.database.findApprovalRequest(workflow.approvalId);
    if (!approval) return;
    const input = this.standardize({ workflow, approval, report: workflow.report });
    await this.handoffToMonitoringIfReady(input, this.database.listNotifications({ workflowId }), new Date().toISOString());
  }

  private async handoffToMonitoringIfReady(input: ApprovedPlanInput, notifications: NotificationRecord[], notifiedAt: string): Promise<void> {
    const expectedCount = this.recipients.resolve(input).length;
    const ready = notifications.length === expectedCount && notifications.every((notification) => notification.status === NotificationStatus.Sent);
    if (!ready) {
      await this.audit(input.workflowId, undefined, 'monitoring_handoff_blocked', {
        expectedCount, notificationCount: notifications.length,
        failedNotificationIds: notifications.filter((notification) => notification.status === NotificationStatus.Failed).map((notification) => notification.notificationId),
      });
      return;
    }
    const eventId = `monitoring-plan-${input.approval.approvalId}`;
    const duplicate = Boolean(this.database.findAgentEvent(eventId));
    await this.reportManagerState(input.workflowId, ManagerWorkflowState.NotificationsSent, { notificationCount: notifications.length });
    await this.queue.publish({ from: 'notification', to: 'monitoring', type: ORCHESTRATOR_JOBS.START_MONITORING, payload: { ...input, notifications, notifiedAt } },
      { idempotencyKey: eventId });
    await this.audit(input.workflowId, undefined, duplicate ? 'duplicate_monitoring_handoff_suppressed' : 'monitoring_handoff_created', { notificationCount: notifications.length });
  }

  private async reportManagerState(workflowId: string, state: ManagerWorkflowState, details: Record<string, unknown>): Promise<void> {
    await this.queue.publish({ from: 'notification', to: 'manager', type: 'workflow_status', payload: { workflowId, state, details } },
      { idempotencyKey: `manager-state-${workflowId}-${state}-${details.notificationId ?? 'workflow'}` });
  }

  private async audit(workflowId: string, notificationId: string | undefined, action: string, details: Record<string, unknown>): Promise<void> {
    const log: NotificationAuditLog = { auditId: `NOTIFY-AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, workflowId, notificationId, action, timestamp: new Date().toISOString(), details };
    await this.database.saveNotificationAudit(log);
  }
}
