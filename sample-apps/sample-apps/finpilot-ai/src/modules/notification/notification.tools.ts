import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';

export interface NotificationChannel {
  name: string;
  deliver(notification: any): Promise<boolean>;
}

export class ConsoleNotificationChannel implements NotificationChannel {
  name = 'console-log-channel';
  async deliver(notification: any): Promise<boolean> {
    const symbol = notification.type === 'warning' ? '⚠️' : notification.type === 'interactive' ? '❓' : '⏰';
    console.log(`[Notification Channel: ${this.name}] ${symbol} [${notification.type.toUpperCase()}] ${notification.title}: ${notification.message}`);
    return true;
  }
}

@Injectable({ deps: [FinanceStore] })
export class NotificationTools {
  private deliveryChannel: NotificationChannel = new ConsoleNotificationChannel();

  constructor(private store: FinanceStore) {}

  @Tool({
    name: 'manage_notifications',
    description:
      'Unified Notification System — Send immediate alerts/reminders (action: send), queue future scheduled notifications (action: schedule), or list notification history (action: list).',
    inputSchema: z.object({
      action: z.enum(['send', 'schedule', 'list']).default('send').describe('Action to perform'),
      type: z.enum(['interactive', 'warning', 'reminder']).optional().default('warning').describe('Type of notification'),
      title: z.string().optional().describe('Short notification title'),
      message: z.string().optional().describe('Detailed notification body text'),
      recipient: z.string().optional().describe('Recipient user'),
      trigger_source: z.string().optional().describe('Source module triggering notification'),
      scheduled_at: z.string().optional().describe('Target execution date or ISO string'),
    }),
  })
  async manageNotifications(input: any, ctx: ExecutionContext) {
    const action = input.action || 'send';

    if (action === 'list') {
      const notifications = this.store.listNotifications(input.type);
      ctx.logger.info('Listing notifications', { count: notifications.length });
      return { count: notifications.length, notifications };
    } else if (action === 'schedule') {
      if (!input.title || !input.message) throw new Error('title and message are required for action: schedule');
      const targetDate = input.scheduled_at || new Date().toISOString();
      const scheduledAt = targetDate.includes('T') ? targetDate : `${targetDate}T09:00:00.000Z`;

      const notif = this.store.addNotification({
        type: input.type || 'reminder',
        title: input.title,
        message: input.message,
        recipient: input.recipient || 'student_user',
        trigger_source: input.trigger_source || 'scheduler',
        status: 'pending',
        scheduled_at: scheduledAt,
      });
      ctx.logger.info('Scheduled notification', { notif_id: notif.id, scheduled_at: scheduledAt });
      return {
        notification_id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        status: notif.status,
        scheduled_at: notif.scheduled_at,
        note: 'Notification queued in scheduler.',
      };
    } else {
      // send
      if (!input.title || !input.message) throw new Error('title and message are required for action: send');
      const scheduledAt = input.scheduled_at || new Date().toISOString();

      const notif = this.store.addNotification({
        type: input.type || 'warning',
        title: input.title,
        message: input.message,
        recipient: input.recipient || 'student_user',
        trigger_source: input.trigger_source || 'system',
        status: 'sent',
        scheduled_at: scheduledAt,
      });

      await this.deliveryChannel.deliver(notif);

      let calendarSynced = false;
      let calendarRecord = null;

      if (input.type === 'reminder') {
        const eventDate = scheduledAt.slice(0, 10);
        const primaryId = `gcal_${Date.now().toString(36)}`;
        const secondaryId = `uni_cal_${Date.now().toString(36)}`;

        calendarRecord = this.store.addCalendarRecord({
          title: input.title,
          description: input.message,
          date: eventDate,
          category: 'bill_due',
          primary_event_id: primaryId,
          secondary_event_id: secondaryId,
        });

        calendarSynced = true;
      }

      ctx.logger.info('Sent notification', { notif_id: notif.id, type: notif.type, calendarSynced });

      return {
        notification_id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        status: notif.status,
        delivery_channel: this.deliveryChannel.name,
        scheduled_at: notif.scheduled_at,
        calendar_auto_synced: calendarSynced,
        calendar_record: calendarRecord,
      };
    }
  }

  // Helper method for internal programmatic calls from other tools
  async sendNotification(input: any, ctx: ExecutionContext) {
    return this.manageNotifications({ action: 'send', ...input }, ctx);
  }
}
