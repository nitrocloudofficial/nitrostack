import { Tool, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { BrainService } from './brain.service.js';

export class BrainTools {
  constructor(private brainService: BrainService) {}

  @Tool({
    name: 'query_meeting_history',
    description:
      "Search the Brain (vector store of past meetings) for context relevant to a query — used by the Supervisor Agent and by anyone asking 'what did we decide about X?'",
    inputSchema: z.object({
      query: z.string().min(1),
      top_k: z.number().default(5)
    })
  })
  async queryHistory(input: { query: string; top_k: number }, ctx: ExecutionContext) {
    ctx.logger.info('Querying meeting brain', { query: input.query });
    return { results: await this.brainService.queryContext(input.query, input.top_k) };
  }

  @Tool({
    name: 'search_external_context',
    description: 'Fetch external, real-time context during a meeting via the Search Engine integration',
    inputSchema: z.object({ query: z.string().min(1) })
  })
  async searchExternal(input: { query: string }) {
    return { results: await this.brainService.searchWeb(input.query) };
  }
}
