import { z } from 'zod';
import { ControllerDecorator as Controller, Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { SlackService } from './slack.service.js';

@Injectable({ deps: [SlackService] })
@Controller()
export class SlackTools {
  constructor(private readonly slackService: SlackService) {}

  @Tool({
    name: 'slack',
    description: 'Perform Slack operations',
    inputSchema: z.object({
      action: z.enum(['sendIncidentAlert', 'sendResolutionMessage']),
      channel: z.string().optional(),
      message: z.string().optional(),
      severity: z.string().optional(),
      incidentId: z.string().optional()
    })
  })
  async execute(args: { action: string, channel?: string, message?: string, severity?: string, incidentId?: string }) {
    switch(args.action) {
      case 'sendIncidentAlert': return { success: true, data: this.slackService.sendIncidentAlert(args.channel!, args.message!) };
      case 'sendResolutionMessage': return { success: true, data: this.slackService.sendResolutionMessage(args.channel!, args.message!) };
      default: throw new Error('Unknown action');
    }
  }
}
