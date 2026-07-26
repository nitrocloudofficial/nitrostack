import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { BackendClient } from './backend-client.js';

const client = new BackendClient();

export class BridgeTools {
  @Tool({
    name: 'backend_chat',
    description: 'Send a chat message to the AEIOS-X FastAPI backend for enterprise processing',
    parameters: z.object({
      message: z.string().describe('The message to send to the backend'),
    }),
  })
  async backendChat(ctx: ExecutionContext) {
    const { message } = ctx.params as { message: string };
    try {
      const result = await client.chat(message);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text' as const, text: `Backend unavailable: ${error}. Use enterprise_chat for direct processing.` }] };
    }
  }

  @Tool({
    name: 'backend_pipeline',
    description: 'Execute a query through the AEIOS-X FastAPI backend pipeline',
    parameters: z.object({
      query: z.string().describe('The query to execute through the backend pipeline'),
    }),
  })
  async backendPipeline(ctx: ExecutionContext) {
    const { query } = ctx.params as { query: string };
    try {
      const result = await client.pipelineExecute(query);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text' as const, text: `Backend unavailable: ${error}. Use enterprise_chat for direct processing.` }] };
    }
  }

  @Tool({
    name: 'backend_health',
    description: 'Check the AEIOS-X FastAPI backend health and connectivity status',
    parameters: z.object({}),
  })
  async backendHealth(ctx: ExecutionContext) {
    const available = await client.isAvailable();
    if (available) {
      const health = await client.health();
      return { content: [{ type: 'text' as const, text: JSON.stringify({ connected: true, ...health }, null, 2) }] };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify({ connected: false, message: 'FastAPI backend is not running. Start it with: uvicorn api.main:app' }, null, 2) }] };
  }
}
