import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { handleRequest } from '../../router.js';
import { processRouterOutput, formatForWidget } from '../../integration.js';
import type { Request } from '../../types.js';

export class RouterTools {
  @Tool({
    name: 'handle_request',
    description: 'Main AIDE router. Takes a natural language request and decides whether to schedule a meeting, assign a task, or run admin checks. Returns a structured RouterOutput.',
    inputSchema: z.object({
      text: z.string().describe('The natural language request from the user'),
      userId: z.string().describe('ID of the user making the request'),
      timestamp: z.string().optional().describe('ISO timestamp of the request (optional, defaults to now)')
    }),
    examples: {
      request: {
        text: 'Book a meeting with eng and design for incident review',
        userId: 'user-123'
      },
      response: {
        originalRequest: {
          text: 'Book a meeting with eng and design for incident review',
          userId: 'user-123',
          timestamp: '2026-07-25T11:12:45.918Z'
        },
        schedulingResult: {
          time: '2025-01-15T14:00:00Z',
          attendees: ['alice', 'bob', 'charlie'],
          duration: 60,
          confidence: 'high'
        },
        finalMessage: {
          text: 'Meeting booked at 2025-01-15T14:00:00Z for alice, bob, charlie (60 min, confidence: high)',
          channel: '#general',
          format: 'slack'
        }
      }
    }
  })
  async handleRequestTool(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Router received request', { text: input.text, userId: input.userId });

    const req: Request = {
      text: input.text,
      userId: input.userId,
      timestamp: input.timestamp || new Date().toISOString()
    };

    // 1. Run the router logic
    const result = await handleRequest(req);

    ctx.logger.info('Router finished', {
      hasScheduling: !!result.schedulingResult,
      hasDelegation: !!result.delegationResult,
      hasAdmin: !!result.adminResult
    });

    // 2. Post to Slack or Discord
    try {
      await processRouterOutput(result);
      ctx.logger.info('Notification sent', {
        format: result.finalMessage.format,
        channel: result.finalMessage.channel
      });
    } catch (err) {
      ctx.logger.warn('Notification failed (non-fatal)', { error: (err as Error).message });
    }

    // 3. Push to dashboard
    try {
      const widgetData = formatForWidget(result);
      await fetch('http://127.0.0.1:3001/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(widgetData),
      });
      ctx.logger.info('Dashboard updated');
    } catch (err) {
      ctx.logger.warn('Dashboard push failed (non-fatal)', { error: (err as Error).message });
    }

    return result;
  }
}