import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { SlackService } from './slack.service.js';

const slackService = new SlackService();

export class SlackTools {
  constructor() {}

  @Tool({
    name: 'post_interactive_alert',
    description: 'Post interactive incident response card to Slack',
    inputSchema: z.object({
      channel_id: z.string(),
      rca_summary: z.string(),
      diff_patch: z.string(),
      trace_url: z.string().optional(),
      action_buttons: z.array(z.string()).optional()
    })
  })
  async postInteractiveAlert(args: { channel_id: string, rca_summary: string, diff_patch: string, trace_url?: string, action_buttons?: string[] }) {
    return await slackService.postAlert(args.channel_id, args.rca_summary, args.diff_patch, args.trace_url, args.action_buttons);
  }

  @Tool({
    name: 'update_thread_message',
    description: 'Appends progress updates to an ongoing incident thread',
    inputSchema: z.object({
      channel_id: z.string(),
      thread_ts: z.string(),
      update_text: z.string()
    })
  })
  async updateThreadMessage(args: { channel_id: string, thread_ts: string, update_text: string }) {
    return await slackService.updateMessage(args.channel_id, args.thread_ts, args.update_text);
  }
}
