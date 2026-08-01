import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CommsTools {
  @Tool({
    name: 'draft_message',
    description: 'Draft a message and determine its destination channel',
    inputSchema: z.object({
      action: z.string().describe('The action requiring a message'),
      details: z.string().describe('Details to include in the message')
    })
  })
  async draftMessage(input: any, ctx: ExecutionContext) {
    let channelsConfig: any = {};
    try {
      const channelsDoc = await prisma.configDocument.findUnique({ where: { key: 'CHANNELS' } });
      if (channelsDoc && channelsDoc.data) {
        channelsConfig = channelsDoc.data;
      }
    } catch (e) {
      ctx.logger.error('Failed to read CHANNELS from DB');
    }

    const { action, details } = input;
    const combinedLower = `${action} ${details}`.toLowerCase();

    // Smart keyword matching for channel routing
    let matchedEvent = 'notification'; // fallback
    for (const eventType of Object.keys(channelsConfig)) {
      if (combinedLower.includes(eventType.toLowerCase().replace(/-/g, ' '))) {
        matchedEvent = eventType;
        break;
      }
    }
    
    // Explicit fallbacks based on common terms
    if (combinedLower.includes('incident')) matchedEvent = 'incident';
    else if (combinedLower.includes('meeting')) matchedEvent = 'meeting-notification';
    else if (combinedLower.includes('task assignment') || combinedLower.includes('assign task') || combinedLower.includes('task')) matchedEvent = 'task-assignment';
    else if (combinedLower.includes('approval')) matchedEvent = 'approval-request';
    else if (combinedLower.includes('alert')) matchedEvent = 'alert';
    else if (combinedLower.includes('reminder')) matchedEvent = 'reminder';

    const channel = channelsConfig[matchedEvent]?.channel || 'default-channel';
    const format = channelsConfig[matchedEvent]?.format || 'text';

    const text = `Draft for ${action}: ${details}`;

    return {
      text,
      channel,
      format
    };
  }

  @Tool({
    name: 'send_message',
    description: 'Send a message to a specific channel (e.g. Slack or Discord)',
    inputSchema: z.object({
      text: z.string().describe('The message content to send'),
      channel: z.string().describe('The channel to send the message to (e.g., #general)'),
      format: z.enum(['slack', 'discord']).describe('The format/platform to use')
    })
  })
  async sendMessage(input: { text: string; channel: string; format: 'slack' | 'discord' }, ctx: ExecutionContext) {
    ctx.logger.info(`Sending message to ${input.format} channel ${input.channel}`);
    const { postToSlack, postToDiscord } = await import('../../notify.js');
    
    try {
      if (input.format === 'slack') {
        await postToSlack(input);
        return { success: true, message: 'Message sent to Slack successfully.' };
      } else if (input.format === 'discord') {
        await postToDiscord(input);
        return { success: true, message: 'Message sent to Discord successfully.' };
      } else {
        throw new Error(`Unsupported format: ${input.format}`);
      }
    } catch (e: any) {
      ctx.logger.error(`Failed to send message: ${e.message}`);
      return { success: false, error: e.message };
    }
  }
}
