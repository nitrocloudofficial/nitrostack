// src/modules/notification/notification.tools.ts
import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { NotificationService } from './notification.service.js';

const SendAlertSchema = z.object({
  contactEmail: z.string().email(),
  patientName: z.string(),
  condition: z.string(),
  hospitalName: z.string().optional(),
  liveLocationUrl: z.string().optional()
});

@Injectable({ deps: [NotificationService] })
export class NotificationTools {
  constructor(private readonly notificationService: NotificationService) {}

  @Tool({
    name: 'send_emergency_alert',
    description: 'Draft and send emergency alert SMS to a contact with patient condition, hospital, and live location.',
    inputSchema: SendAlertSchema
  })
  async sendEmergencyAlert(args: z.infer<typeof SendAlertSchema>, ctx: ExecutionContext) {
    const message =
      `🚨 EMERGENCY ALERT\n` +
      `${args.patientName} needs urgent help.\n` +
      `Condition: ${args.condition}\n` +
      (args.hospitalName ? `Nearest hospital: ${args.hospitalName}\n` : '') +
      (args.liveLocationUrl ? `Location: ${args.liveLocationUrl}\n` : '') +
      `Please respond immediately.`;

    ctx.logger.info('Sending emergency alert', { to: args.contactEmail });

    try {
      const result = await this.notificationService.sendAlert(
        args.contactEmail,
        `🚨 EMERGENCY ALERT — ${args.patientName}`,
        message
      );
      return { sent: true, ...result, messagePreview: message };
    } catch (err: any) {
      ctx.logger.error('Alert send failed', { error: err.message });
      return { sent: false, error: err.message, messagePreview: message };
    }
}
}