import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

const HealthCheckOutputSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  timestamp: z.string(),
  version: z.string(),
  message: z.string().optional()
});

/**
 * Health Check Tool — verify server is running and healthy
 */
export class HealthCheckTools {
  @Tool({
    name: 'health-check',
    description: 'Check if the QuantGuard MCP server is running and healthy',
    inputSchema: z.object({}),
    outputSchema: HealthCheckOutputSchema
  })
  async healthCheck(ctx: ExecutionContext) {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      message: 'QuantGuard MCP server is running'
    };
  }
}
