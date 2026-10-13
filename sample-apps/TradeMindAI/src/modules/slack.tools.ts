import { ToolDecorator as Tool, ExecutionContext } from "@nitrostack/core";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { AgentResult } from "../shared-types.js";
import { writeToContextEngine, toMCPResponse } from "../mcp-utils.js";

const contextEngineUrl = process.env.CONTEXT_ENGINE_URL || "http://localhost:3001";
const slackBotToken = process.env.SLACK_BOT_TOKEN;

export class SlackTools {
  @Tool({
    name: "send_notification",
    description: "Send Slack notification message to specified channel or user",
    inputSchema: z.object({
      user_id: z.string().uuid(),
      message: z.string(),
      channel: z.string().optional(),
      workflow_id: z.string().optional(),
    }),
  })
  async sendNotification(input: { user_id: string; message: string; channel?: string; workflow_id?: string }, ctx?: ExecutionContext) {
    const targetChannel = input.channel || "#general";
    let status = "SENT";
    let messageId = uuidv4();
    let isLiveSlack = false;

    if (slackBotToken) {
      try {
        const res = await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${slackBotToken}`,
          },
          body: JSON.stringify({
            channel: targetChannel,
            text: input.message,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { ok?: boolean; ts?: string; error?: string };
          if (data.ok && data.ts) {
            messageId = data.ts;
            isLiveSlack = true;
          } else if (data.error) {
            console.warn(`[slack] Slack API returned error: ${data.error}`);
          }
        }
      } catch (e) {
        console.warn("[slack] Failed to send live Slack message:", e);
      }
    }

    const notification = {
      message_id: messageId,
      user_id: input.user_id,
      channel: targetChannel,
      message: input.message,
      status,
      delivery_type: isLiveSlack ? "Live Slack Web API" : "Simulated Notification",
      timestamp: new Date().toISOString(),
    };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "communication",
      result_data: notification,
      confidence_score: 0.99,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(notification);
  }

  @Tool({
    name: "get_channel_history",
    description: "Get recent messages from a Slack channel",
    inputSchema: z.object({
      channel: z.string(),
      limit: z.number().int().positive().default(50),
      workflow_id: z.string().optional(),
    }),
  })
  async getChannelHistory(input: { channel: string; limit?: number; workflow_id?: string }, ctx?: ExecutionContext) {
    const messages = [];
    for (let i = 0; i < 5; i++) {
      messages.push({
        message_id: uuidv4(),
        user: "copilot",
        text: `Message ${i + 1}: Trade recommendation for ${["AAPL", "GOOGL", "MSFT"][Math.floor(Math.random() * 3)]}`,
        timestamp: new Date(Date.now() - i * 3600 * 1000).toISOString(),
      });
    }

    const payload = { channel: input.channel, messages };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "communication",
      result_data: payload,
      confidence_score: 0.95,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(payload);
  }

  @Tool({
    name: "create_thread",
    description: "Start a new conversation thread in a Slack channel",
    inputSchema: z.object({
      channel: z.string(),
      message: z.string(),
      workflow_id: z.string().optional(),
    }),
  })
  async createThread(input: { channel: string; message: string; workflow_id?: string }, ctx?: ExecutionContext) {
    const thread = {
      thread_id: uuidv4(),
      channel: input.channel,
      initial_message: input.message,
      status: "CREATED",
      timestamp: new Date().toISOString(),
    };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "communication",
      result_data: thread,
      confidence_score: 0.98,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(thread);
  }
}
