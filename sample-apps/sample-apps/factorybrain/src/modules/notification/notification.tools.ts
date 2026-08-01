import { ControllerDecorator as Controller, ToolDecorator as Tool, Widget, z } from '@nitrostack/core';
import { DatabaseService } from '../../services/database.service.js';
import { NotificationAgent } from './notification.agent.js';
import { NotificationRealtimeService } from './notification-realtime.service.js';
import { approvedPlanSchema } from './notification.schemas.js';

@Controller('notification')
export class NotificationTools {
  constructor(private readonly agent: NotificationAgent, private readonly database: DatabaseService, private readonly realtime: NotificationRealtimeService) {}

  @Tool({ name: 'notify_teams', description: 'Notify all teams for an approved FactoryBrain plan.', inputSchema: approvedPlanSchema })
  async notifyTeams(input: z.infer<typeof approvedPlanSchema>) { return this.agent.notifyTeams(input as never); }

  @Tool({ name: 'list_notifications', description: 'List notification delivery states and live-update sequence numbers.', inputSchema: z.object({ workflowId: z.string().optional(), status: z.enum(['Pending', 'Sending', 'Sent', 'Failed']).optional(), afterSequence: z.number().int().nonnegative().optional() }) })
  @Widget('manager-approval')
  async listNotifications(input: { workflowId?: string; status?: string; afterSequence?: number }) { return this.database.listNotifications(input); }

  @Tool({ name: 'retry_notification', description: 'Retry a failed notification.', inputSchema: z.object({ notificationId: z.string() }) })
  async retryNotification(input: { notificationId: string }) { return this.agent.retryNotification(input.notificationId); }

  @Tool({ name: 'recover_notification_events', description: 'Recover dashboard notification events missed after a WebSocket disconnect.', inputSchema: z.object({ afterSequence: z.number().int().nonnegative() }) })
  async recoverEvents(input: { afterSequence: number }) { return this.realtime.recover(input.afterSequence); }

  @Tool({ name: 'list_notification_audit_logs', description: 'List Notification Agent audit logs.', inputSchema: z.object({ workflowId: z.string().optional() }) })
  async listAudits(input: { workflowId?: string }) { return this.database.listNotificationAudits(input.workflowId); }
}
