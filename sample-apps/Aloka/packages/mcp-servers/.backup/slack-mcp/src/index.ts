#!/usr/bin/env node
import { Module, ToolDecorator as Tool, Injectable, McpApp, McpApplicationFactory, z } from '@nitrostack/core';
import { Sanitizer } from '@omnitrace/sanitizer';
import { WebClient } from '@slack/web-api';

@Injectable()
export class SlackService {
  private client: WebClient;

  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  public async postAlert(channelId: string, summary: string, diff: string, traceUrl?: string, actions?: string[]): Promise<string> {
    try {
      const blocks: any[] = [
        {
          type: "header",
          text: { type: "plain_text", text: "🚨 Build Failure Detected" }
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*RCA Summary:*\n${summary}` }
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*Suggested Patch:*\n\`\`\`diff\n${diff}\n\`\`\`` }
        }
      ];

      if (traceUrl) {
        blocks.push({
          type: "section",
          text: { type: "mrkdwn", text: `<${traceUrl}|View Distributed Trace>` }
        });
      }

      if (actions && actions.length > 0) {
        blocks.push({
          type: "actions",
          elements: actions.map(a => ({
            type: "button",
            text: { type: "plain_text", text: a },
            value: a
          }))
        });
      }

      const res = await this.client.chat.postMessage({
        channel: channelId,
        text: "Build Failure Detected",
        blocks
      });

      return Sanitizer.scrub(`[SUCCESS] Message posted in ${channelId}. Thread ID: ${res.ts}`);
    } catch (e: any) {
      return `[ERROR] Slack API Error: ${e.message}`;
    }
  }

  public async updateMessage(channelId: string, threadTs: string, update: string): Promise<string> {
    try {
      await this.client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: update
      });
      return Sanitizer.scrub(`[SUCCESS] Thread ${threadTs} updated.`);
    } catch (e: any) {
      return `[ERROR] Slack API Error: ${e.message}`;
    }
  }
}

@McpApp({ 
  module: SlackServer, 
  server: { name: 'slack-mcp', version: '1.0.0' },
  logging: { level: 'error' }
})
@Module({ 
  name: 'slack', 
  imports: [
    
  ],
  providers: [SlackService] 
})
export class SlackServer {
  constructor(private readonly slackService: SlackService) {}

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
    return await this.slackService.postAlert(args.channel_id, args.rca_summary, args.diff_patch, args.trace_url, args.action_buttons);
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
    return await this.slackService.updateMessage(args.channel_id, args.thread_ts, args.update_text);
  }
}

async function bootstrap() {
  const server = await McpApplicationFactory.create(SlackServer);
  await server.start();
}
bootstrap().catch(console.error);
