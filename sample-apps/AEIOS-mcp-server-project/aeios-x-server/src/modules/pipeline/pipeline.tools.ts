import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { PipelineService } from './pipeline.service.js';

const pipelineService = new PipelineService();

export class PipelineTools {
  @Tool({
    name: 'enterprise_chat',
    description:
      'Send a query through the AEIOS-X Enterprise AI Pipeline. ' +
      'Automatically detects intent, creates specialist AI agents, ' +
      'executes them in parallel, builds consensus, and synthesizes ' +
      'an enterprise-grade response.',
    inputSchema: z.object({
      query: z.string().describe('The enterprise query or question to process'),
      userId: z.string().optional().describe('Optional user identifier'),
      sessionId: z.string().optional().describe('Optional session identifier'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  async enterpriseChat(
    input: { query: string; userId?: string; sessionId?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Executing enterprise pipeline', { query: input.query });

    const response = await pipelineService.execute({
      query: input.query,
      userId: input.userId,
      sessionId: input.sessionId,
    });

    return {
      success: response.success,
      response: response.result,
      metadata: response.metadata,
    };
  }

  @Tool({
    name: 'get_pipeline_status',
    description:
      'Get the current status of the AEIOS-X Enterprise Pipeline ' +
      'including execution counts, success rates, and average execution time.',
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true,
    },
  })
  async getPipelineStatus(_input: Record<string, never>, ctx: ExecutionContext) {
    return pipelineService.getStatus();
  }

  @Tool({
    name: 'reset_pipeline',
    description: 'Reset pipeline statistics and counters.',
    inputSchema: z.object({}),
    annotations: {
      destructiveHint: true,
    },
  })
  async resetPipeline(_input: Record<string, never>, ctx: ExecutionContext) {
    pipelineService.reset();
    return { success: true, message: 'Pipeline statistics reset.' };
  }
}
