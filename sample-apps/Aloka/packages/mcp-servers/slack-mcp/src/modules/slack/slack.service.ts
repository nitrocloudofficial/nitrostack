import { Injectable } from '@nitrostack/core';
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
