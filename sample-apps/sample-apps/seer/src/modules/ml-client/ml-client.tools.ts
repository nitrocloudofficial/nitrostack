import { ExecutionContext, Injectable, ToolDecorator as Tool, z } from '@nitrostack/core';
import { MlClientService, MlServiceError } from './ml-client.service.js';

@Injectable({ deps: [MlClientService] })
export class MlClientTools {
  constructor(private readonly mlClient: MlClientService) {}

  @Tool({
    name: 'python_health',
    description: 'Check that the Seer Python ML service is reachable and healthy.',
    inputSchema: z.object({}).strict(),
  })
  async pythonHealth(_input: Record<string, never>, context: ExecutionContext) {
    try {
      return await this.mlClient.health(context.requestId);
    } catch (error) {
      const code = error instanceof MlServiceError ? error.code : 'unknown';
      context.logger.error('ML service health check failed', { code, requestId: context.requestId });
      throw error;
    }
  }
}
